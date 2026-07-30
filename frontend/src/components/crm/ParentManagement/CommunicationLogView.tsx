import { useCallback, useEffect, useState } from 'react';
import { Send, Mail, Phone, MessageSquare, Eye, Search, CheckCircle2, Plus, Trash2, Clock, CalendarClock } from 'lucide-react';
import {
  cancelParentCommunicationCampaign,
  createParentCommunicationCampaign,
  fetchParentCommunication,
  fetchParentCommunicationCampaigns,
  fetchParentCommunications,
  fetchParentCommunicationsMeta,
  sendParentCommunicationCampaignNow,
  type AudienceBatch,
  type CommunicationCampaign,
  type CommunicationRecord,
} from '../../../lib/parentCommunicationServices';
import { fetchStudentsMeta } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

const CHANNEL_ICONS: Record<string, typeof Mail> = { EMAIL: Mail, SMS: MessageSquare, CALL: Phone, APP: MessageSquare, WHATSAPP: MessageSquare, NOTICE: Mail };

type AudienceRow = AudienceBatch & { key: string };

const EMPTY_BATCH = (): AudienceRow => ({ key: `batch-${Date.now()}-${Math.random()}`, className: '', sectionName: '', parentRelationship: '' });

const DEFAULT_SEND_FORM = {
  channel: 'SMS',
  subject: '',
  body: '',
  category: 'general',
  scheduledAt: '',
  recurrenceType: 'NONE' as 'NONE' | 'WEEKLY' | 'MONTHLY' | 'DAY_15',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-IN') : '—';
}

function toDatetimeLocalValue(iso?: string) {
  if (!iso) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CommunicationLogView() {
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
  const [summary, setSummary] = useState<{ total: number; sent: number; planned: number; important: number } | null>(null);
  const [campaignSummary, setCampaignSummary] = useState<{ drafts: number; scheduled: number; active: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [detailRecord, setDetailRecord] = useState<CommunicationRecord | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, string[]>>({});
  const [sendForm, setSendForm] = useState(DEFAULT_SEND_FORM);
  const [audienceBatches, setAudienceBatches] = useState<AudienceRow[]>([EMPTY_BATCH()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list, campaignList] = await Promise.all([
        fetchParentCommunicationsMeta(),
        fetchParentCommunications({
          status: filterStatus || undefined,
          channel: filterChannel || undefined,
          q: searchQuery || undefined,
        }),
        fetchParentCommunicationCampaigns(),
      ]);
      setSummary(meta.summary);
      setCampaignSummary(meta.campaigns);
      setRecords(list.records);
      setCampaigns(campaignList.campaigns.filter((c) => ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(c.status)));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterChannel, searchQuery]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((r) => {
      setClassOptions(r.filters.classes);
      setSectionsByClass(r.filters.sectionsByClass);
    });
  }, []);

  const resetSendModal = () => {
    setSendForm({ ...DEFAULT_SEND_FORM, scheduledAt: toDatetimeLocalValue() });
    setAudienceBatches([EMPTY_BATCH()]);
  };

  const openSendModal = () => {
    resetSendModal();
    setShowSend(true);
  };

  const openDetail = async (record: CommunicationRecord) => {
    try {
      const res = await fetchParentCommunication(record.id);
      setDetailRecord(res.record);
    } catch {
      setDetailRecord(record);
    }
  };

  const updateBatch = (key: string, patch: Partial<AudienceRow>) => {
    setAudienceBatches((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const validateForm = () => {
    if (!sendForm.subject.trim() || !sendForm.body.trim()) {
      setMessage('Subject and message body are required.');
      return false;
    }
    return true;
  };

  const buildPayload = (action: 'draft' | 'send_now' | 'scheduled') => ({
    action,
    channel: sendForm.channel,
    subject: sendForm.subject.trim(),
    body: sendForm.body.trim(),
    category: sendForm.category,
    audienceBatches: audienceBatches.map(({ className, sectionName, parentRelationship }) => ({
      className: className || undefined,
      sectionName: sectionName || undefined,
      parentRelationship: parentRelationship || undefined,
    })),
    scheduledAt: action === 'scheduled' ? new Date(sendForm.scheduledAt).toISOString() : undefined,
    recurrenceType: sendForm.recurrenceType,
  });

  const handleCampaignAction = async (action: 'draft' | 'send_now' | 'scheduled') => {
    if (!validateForm()) return;
    if (action === 'scheduled' && !sendForm.scheduledAt) {
      setMessage('Pick a date and time for scheduled send.');
      return;
    }

    setSending(true);
    try {
      const result = await createParentCommunicationCampaign(buildPayload(action));
      setShowSend(false);
      resetSendModal();

      if (action === 'draft') {
        setMessage(`Draft saved — ${result.campaign.campaignCode}.`);
      } else if (action === 'send_now') {
        const count = result.execution?.count ?? 0;
        setMessage(`Sent and auto-recorded ${count} communication(s) — campaign ${result.campaign.campaignCode}.`);
      } else {
        const when = formatDate(result.campaign.nextRunAt || result.campaign.scheduledAt);
        const recur = result.campaign.recurrenceType !== 'NONE' ? ` (${result.campaign.recurrenceLabel})` : '';
        setMessage(`Scheduled ${result.campaign.campaignCode} for ${when}${recur}.`);
      }
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSendDraft = async (campaign: CommunicationCampaign) => {
    setSending(true);
    try {
      const result = await sendParentCommunicationCampaignNow(campaign.id);
      setMessage(`Sent ${result.execution.count} communication(s) from draft ${campaign.campaignCode}.`);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send draft');
    } finally {
      setSending(false);
    }
  };

  const handleCancelCampaign = async (campaign: CommunicationCampaign) => {
    try {
      await cancelParentCommunicationCampaign(campaign.id);
      setMessage(`Cancelled campaign ${campaign.campaignCode}.`);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to cancel campaign');
    }
  };

  if (loading && !summary) return <ParentLoading label="Loading communication log…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Communication Log"
        title="Communication Log"
        subtitle="Draft, schedule, or send SMS/email to parents — every delivery is auto-recorded in the log."
        actions={
          <button type="button" onClick={openSendModal} className={pm.btnPrimary}>
            <Send size={14} /> Send SMS / Email
          </button>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

        {summary && (
          <ParentKpiGrid>
            <ParentKpiCard label="Total" value={summary.total} />
            <ParentKpiCard label="Sent" value={summary.sent} valueClassName="text-emerald-600" />
            <ParentKpiCard label="Planned" value={summary.planned} valueClassName="text-amber-600" />
            <ParentKpiCard label="Drafts" value={campaignSummary?.drafts ?? 0} valueClassName="text-slate-600" />
            <ParentKpiCard label="Scheduled" value={(campaignSummary?.scheduled ?? 0) + (campaignSummary?.active ?? 0)} valueClassName="text-indigo-600" />
          </ParentKpiGrid>
        )}

        {campaigns.length > 0 && (
          <ParentTableCard title="Drafts & Scheduled Campaigns" footer={`${campaigns.length} campaign(s)`}>
            <table className={pm.table}>
              <thead className={pm.tableHead}>
                <tr>
                  <th className={pm.th}>Code</th>
                  <th className={pm.th}>Subject</th>
                  <th className={pm.th}>Audiences</th>
                  <th className={pm.th}>Schedule</th>
                  <th className={pm.th}>Recurrence</th>
                  <th className={pm.th}>Status</th>
                  <th className={pm.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={pm.tbody}>
                {campaigns.map((c) => (
                  <tr key={c.id} className={pm.trHover}>
                    <td className={`${pm.td} font-mono text-xs`}>{c.campaignCode}</td>
                    <td className={pm.td}>
                      <div className="font-medium text-slate-800">{c.subject}</div>
                      <div className="text-[10px] text-slate-500">{c.channel} · {c.category}</div>
                    </td>
                    <td className={pm.td}>{c.audienceBatchCount} filter set(s)</td>
                    <td className={`${pm.td} text-xs whitespace-nowrap`}>
                      {c.nextRunAt ? formatDate(c.nextRunAt) : c.scheduledAt ? formatDate(c.scheduledAt) : '—'}
                    </td>
                    <td className={pm.td}>{c.recurrenceLabel}</td>
                    <td className={pm.td}>
                      <span className={`${pm.badge} ${c.status === 'DRAFT' ? pm.badgeAmber : c.status === 'ACTIVE' ? pm.badgeGreen : 'bg-indigo-50 text-indigo-700'}`}>
                        {c.statusLabel}
                      </span>
                    </td>
                    <td className={pm.td}>
                      <div className="flex flex-wrap gap-2">
                        {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => void handleSendDraft(c)}
                            className="text-xs text-indigo-700 font-bold hover:underline"
                          >
                            Send now
                          </button>
                        )}
                        {c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => void handleCancelCampaign(c)}
                            className="text-xs text-red-600 font-bold hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ParentTableCard>
        )}

        <div className={`${pm.card} ${pm.cardPad} space-y-3`}>
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                placeholder="Search parent name, mobile, subject…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
                className={`${pm.input} flex-1`}
              />
              <button type="button" onClick={() => void load()} className={pm.btnSecondary}>
                <Search size={14} /> Search
              </button>
            </div>
            <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className={pm.select}>
              <option value="">All channels</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="APP">App</option>
              <option value="CALL">Call</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={pm.select}>
              <option value="">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="READ">Read</option>
              <option value="PLANNED">Planned</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <p className="text-[10px] text-slate-400">
            Communications are recorded automatically per parent mobile when messages are sent from the system.
          </p>
        </div>

        <ParentTableCard title="Auto-recorded Communications" footer={`${records.length} record(s)`}>
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Channel</th>
                <th className={pm.th}>Parent</th>
                <th className={pm.th}>Mobile</th>
                <th className={pm.th}>Student</th>
                <th className={pm.th}>Subject</th>
                <th className={pm.th}>Date &amp; Time</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>View</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400 text-sm">No communications recorded yet</td></tr>
              ) : records.map((r) => {
                const Icon = CHANNEL_ICONS[r.channel] || MessageSquare;
                return (
                  <tr key={r.id} className={pm.trHover}>
                    <td className={pm.td}>
                      <Icon size={14} className="inline mr-1.5 text-slate-400" />
                      {r.channelLabel}
                    </td>
                    <td className={`${pm.td} font-medium text-slate-800`}>{r.parentName}</td>
                    <td className={`${pm.td} text-slate-600 text-xs font-mono`}>{r.parentMobile}</td>
                    <td className={pm.td}>
                      <div className="text-sm">{r.studentName}</div>
                      <div className="text-[10px] text-slate-500">{r.classGroup}</div>
                    </td>
                    <td className={`${pm.td} text-slate-800`}>{r.subject || r.body.slice(0, 50)}</td>
                    <td className={`${pm.td} text-slate-500 text-xs whitespace-nowrap`}>
                      {formatDate(r.sentAt || r.plannedAt)}
                    </td>
                    <td className={pm.td}>
                      <span className={`${pm.badge} ${r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'READ' ? pm.badgeGreen : r.status === 'FAILED' ? pm.badgeRed : pm.badgeAmber}`}>
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className={pm.td}>
                      <button
                        type="button"
                        onClick={() => void openDetail(r)}
                        className="text-xs text-indigo-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal open={!!detailRecord} onClose={() => setDetailRecord(null)} title="Communication Details" large>
        {detailRecord && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Mode</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailRecord.channelLabel}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Date &amp; Time</p>
                <p className="font-semibold text-slate-800 mt-0.5">{formatDate(detailRecord.sentAt || detailRecord.plannedAt)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Parent</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailRecord.parentName}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Registered Mobile</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">{detailRecord.parentMobile}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Student</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailRecord.studentName}</p>
                <p className="text-xs text-slate-500">{detailRecord.classGroup}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailRecord.statusLabel}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Subject / Title</p>
              <p className="font-semibold text-slate-900 p-3 rounded-lg border border-slate-200 bg-white">
                {detailRecord.subject || '—'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Message</p>
              <p className="text-slate-700 p-3 rounded-lg border border-slate-200 bg-white whitespace-pre-wrap leading-relaxed">
                {detailRecord.body || '—'}
              </p>
            </div>

            {detailRecord.campaignId && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Auto-recorded · Campaign {detailRecord.campaignId}
              </p>
            )}
          </div>
        )}
      </ParentModal>

      <ParentModal open={showSend} onClose={() => setShowSend(false)} title="Send SMS / Email" large>
        <p className="text-xs text-slate-500 -mt-2">
          Create &amp; save as draft, send now, or schedule for later. Add multiple audience filter sets to reach different class/section groups with the same message.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={sendForm.channel} onChange={(e) => setSendForm((f) => ({ ...f, channel: e.target.value }))} className={pm.selectFull}>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="APP">App Notification</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select value={sendForm.category} onChange={(e) => setSendForm((f) => ({ ...f, category: e.target.value }))} className={pm.selectFull}>
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="fee">Fee</option>
              <option value="absence_alert">Absence Alert</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Audience filters</p>
              <button
                type="button"
                onClick={() => setAudienceBatches((rows) => [...rows, EMPTY_BATCH()])}
                className={`${pm.btnSecondary} text-xs py-1`}
              >
                <Plus size={12} /> Add audience
              </button>
            </div>
            {audienceBatches.map((batch, index) => (
              <div key={batch.key} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-lg border border-slate-200/80 bg-slate-50/50">
                <select
                  value={batch.className || ''}
                  onChange={(e) => updateBatch(batch.key, { className: e.target.value, sectionName: '' })}
                  className={pm.selectFull}
                >
                  <option value="">All Classes</option>
                  {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={batch.sectionName || ''}
                  onChange={(e) => updateBatch(batch.key, { sectionName: e.target.value })}
                  disabled={!batch.className}
                  className={pm.selectFull}
                >
                  <option value="">All Sections</option>
                  {(sectionsByClass[batch.className || ''] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={batch.parentRelationship || ''}
                  onChange={(e) => updateBatch(batch.key, { parentRelationship: e.target.value })}
                  className={pm.selectFull}
                >
                  <option value="">All Parents</option>
                  <option value="FATHER">Father only</option>
                  <option value="MOTHER">Mother only</option>
                </select>
                {audienceBatches.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setAudienceBatches((rows) => rows.filter((r) => r.key !== batch.key))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Remove audience"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 p-2">Set {index + 1}</span>
                )}
              </div>
            ))}
          </div>

          <input
            placeholder="Subject / title"
            value={sendForm.subject}
            onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))}
            className={pm.input}
          />
          <textarea
            placeholder="Message body"
            value={sendForm.body}
            onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
            className={pm.input}
            rows={4}
          />

          <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/40 p-3 space-y-3">
            <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
              <CalendarClock size={14} /> Schedule &amp; recurrence
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600 space-y-1">
                <span>Scheduled date &amp; time</span>
                <input
                  type="datetime-local"
                  value={sendForm.scheduledAt}
                  onChange={(e) => setSendForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className={pm.input}
                />
              </label>
              <label className="text-xs text-slate-600 space-y-1">
                <span>Recurring frequency</span>
                <select
                  value={sendForm.recurrenceType}
                  onChange={(e) => setSendForm((f) => ({ ...f, recurrenceType: e.target.value as typeof sendForm.recurrenceType }))}
                  className={pm.selectFull}
                >
                  <option value="NONE">One-time only</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="DAY_15">Every 15th of month</option>
                </select>
              </label>
            </div>
            <p className="text-[10px] text-slate-500">
              Use scheduled date/time with <strong>Schedule Send</strong> for one-time future delivery, or pick a recurrence for automated repeats.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-slate-200/60 mt-4">
          <button type="button" onClick={() => setShowSend(false)} className={pm.btnCancel}>
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void handleCampaignAction('draft')}
            className={pm.btnSecondary}
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void handleCampaignAction('scheduled')}
            className={pm.btnSecondary}
          >
            <Clock size={14} /> {sending ? 'Saving…' : 'Schedule Send'}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void handleCampaignAction('send_now')}
            className={pm.btnSave}
          >
            <Send size={14} /> {sending ? 'Sending…' : 'Send Now'}
          </button>
        </div>
      </ParentModal>
    </ParentPageShell>
  );
}
