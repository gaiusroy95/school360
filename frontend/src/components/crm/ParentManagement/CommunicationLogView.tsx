import { useCallback, useEffect, useState } from 'react';
import { Plus, Mail, Phone, MessageSquare } from 'lucide-react';
import {
  createParentCommunication, fetchParentCommunications, fetchParentCommunicationsMeta,
  type CommunicationRecord,
} from '../../../lib/parentCommunicationServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

const CHANNEL_ICONS: Record<string, typeof Mail> = { EMAIL: Mail, SMS: MessageSquare, CALL: Phone };

export function CommunicationLogView() {
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; sent: number; planned: number; important: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState({
    studentId: '', parentRelationship: 'FATHER', channel: 'SMS', subject: '', body: '', status: 'SENT', category: 'general',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchParentCommunicationsMeta(),
        fetchParentCommunications({ status: filterStatus || undefined }),
      ]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) =>
      setStudents(r.students.map((s) => ({ id: s.id, fullName: s.fullName }))),
    );
  }, []);

  const handleCreate = async () => {
    if (!form.studentId) return;
    await createParentCommunication({
      ...form,
      sentAt: form.status === 'SENT' ? new Date().toISOString() : undefined,
    });
    setShowForm(false);
    void load();
  };

  if (loading && !summary) return <ParentLoading label="Loading communication log…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Communication Log"
        title="Communication Log"
        subtitle="Track outbound and inbound messages with channel, status, and category."
        actions={
          <button type="button" onClick={() => setShowForm(true)} className={pm.btnPrimary}>
            <Plus size={14} /> Log Communication
          </button>
        }
      />

      <div className={pm.content}>
        {summary && (
          <ParentKpiGrid>
            <ParentKpiCard label="Total" value={summary.total} />
            <ParentKpiCard label="Sent" value={summary.sent} valueClassName="text-emerald-600" />
            <ParentKpiCard label="Planned" value={summary.planned} valueClassName="text-amber-600" />
            <ParentKpiCard label="Important" value={summary.important} valueClassName="text-indigo-600" />
          </ParentKpiGrid>
        )}

        <div className={pm.filterBar}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={pm.select}>
            <option value="">All statuses</option>
            <option value="SENT">Sent</option>
            <option value="PLANNED">Planned</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <ParentTableCard title="Communications" footer={`${records.length} record(s)`}>
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Channel</th>
                <th className={pm.th}>Subject</th>
                <th className={pm.th}>Category</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>Date</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.map((r) => {
                const Icon = CHANNEL_ICONS[r.channel] || MessageSquare;
                return (
                  <tr key={r.id} className={pm.trHover}>
                    <td className={pm.td}><Icon size={14} className="inline mr-1.5 text-slate-400" />{r.channelLabel}</td>
                    <td className={`${pm.td} font-medium text-slate-800`}>{r.subject || r.body.slice(0, 40)}</td>
                    <td className={pm.td}>{r.category}</td>
                    <td className={pm.td}>
                      <span className={`${pm.badge} ${r.status === 'SENT' ? pm.badgeGreen : pm.badgeAmber}`}>{r.statusLabel}</span>
                    </td>
                    <td className={`${pm.td} text-slate-500 text-xs`}>
                      {r.sentAt ? new Date(r.sentAt).toLocaleString('en-IN') : r.plannedAt ? new Date(r.plannedAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal open={showForm} onClose={() => setShowForm(false)} title="Log Communication">
        <div className="space-y-3">
          <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={pm.selectFull}>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} className={pm.selectFull}>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="CALL">Call</option>
            <option value="APP">App</option>
            <option value="NOTICE">Notice</option>
          </select>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={pm.selectFull}>
            <option value="general">General</option>
            <option value="absence_alert">Absence Alert</option>
            <option value="academic">Academic</option>
            <option value="fee">Fee</option>
          </select>
          <input placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={pm.input} />
          <textarea placeholder="Message body" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className={pm.input} rows={3} />
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={pm.selectFull}>
            <option value="SENT">Sent</option>
            <option value="PLANNED">Planned</option>
          </select>
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} />
      </ParentModal>
    </ParentPageShell>
  );
}
