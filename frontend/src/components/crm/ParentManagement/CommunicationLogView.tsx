import { useCallback, useEffect, useState } from 'react';
import { Send, Mail, Phone, MessageSquare, Eye, Search, CheckCircle2 } from 'lucide-react';
import {
  bulkSendParentCommunications, fetchParentCommunication, fetchParentCommunications,
  fetchParentCommunicationsMeta, type CommunicationRecord,
} from '../../../lib/parentCommunicationServices';
import { fetchStudentsMeta } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

const CHANNEL_ICONS: Record<string, typeof Mail> = { EMAIL: Mail, SMS: MessageSquare, CALL: Phone, APP: MessageSquare, WHATSAPP: MessageSquare, NOTICE: Mail };

export function CommunicationLogView() {
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; sent: number; planned: number; important: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [detailRecord, setDetailRecord] = useState<CommunicationRecord | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [sendForm, setSendForm] = useState({
    channel: 'SMS',
    subject: '',
    body: '',
    category: 'general',
    className: '',
    sectionName: '',
    parentRelationship: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchParentCommunicationsMeta(),
        fetchParentCommunications({
          status: filterStatus || undefined,
          channel: filterChannel || undefined,
          q: searchQuery || undefined,
        }),
      ]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterChannel, searchQuery]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((r) => setClassOptions(r.filters.classes));
  }, []);

  useEffect(() => {
    if (!sendForm.className) {
      setSectionOptions([]);
      return;
    }
    void fetchStudentsMeta().then((r) => {
      setSectionOptions(r.filters.sectionsByClass[sendForm.className] || []);
    });
  }, [sendForm.className]);

  const openDetail = async (record: CommunicationRecord) => {
    try {
      const res = await fetchParentCommunication(record.id);
      setDetailRecord(res.record);
    } catch {
      setDetailRecord(record);
    }
  };

  const handleBulkSend = async () => {
    if (!sendForm.subject.trim() || !sendForm.body.trim()) {
      setMessage('Subject and message body are required.');
      return;
    }
    setSending(true);
    try {
      const result = await bulkSendParentCommunications({
        channel: sendForm.channel,
        subject: sendForm.subject.trim(),
        body: sendForm.body.trim(),
        category: sendForm.category,
        className: sendForm.className || undefined,
        sectionName: sendForm.sectionName || undefined,
        parentRelationship: sendForm.parentRelationship || undefined,
      });
      setShowSend(false);
      setSendForm({ channel: 'SMS', subject: '', body: '', category: 'general', className: '', sectionName: '', parentRelationship: '' });
      setMessage(`Sent and auto-recorded ${result.count} communication(s) — campaign ${result.campaignId}.`);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

  if (loading && !summary) return <ParentLoading label="Loading communication log…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Communication Log"
        title="Communication Log"
        subtitle="All parent communications are auto-recorded when sent — SMS, email, app, and calls linked to registered mobile numbers."
        actions={
          <button type="button" onClick={() => setShowSend(true)} className={pm.btnPrimary}>
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
            <ParentKpiCard label="Important" value={summary.important} valueClassName="text-indigo-600" />
          </ParentKpiGrid>
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
          Each parent receives the message on their registered mobile/email. Every delivery is auto-recorded in the log.
        </p>
        <div className="space-y-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={sendForm.className} onChange={(e) => setSendForm((f) => ({ ...f, className: e.target.value, sectionName: '' }))} className={pm.selectFull}>
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sendForm.sectionName} onChange={(e) => setSendForm((f) => ({ ...f, sectionName: e.target.value }))} disabled={!sendForm.className} className={pm.selectFull}>
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sendForm.parentRelationship} onChange={(e) => setSendForm((f) => ({ ...f, parentRelationship: e.target.value }))} className={pm.selectFull}>
              <option value="">All Parents</option>
              <option value="FATHER">Father only</option>
              <option value="MOTHER">Mother only</option>
            </select>
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
        </div>
        <ParentModalActions
          onCancel={() => setShowSend(false)}
          onConfirm={() => void handleBulkSend()}
          confirmLabel={sending ? 'Sending…' : 'Send & Auto-Record'}
        />
      </ParentModal>
    </ParentPageShell>
  );
}
