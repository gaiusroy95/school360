import { useCallback, useEffect, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import {
  createParentEngagement, fetchParentEngagements, fetchParentEngagementsMeta,
  updateParentEngagement, type EngagementRecord,
} from '../../../lib/parentEngagementServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

export function ParentsEngagementView() {
  const [records, setRecords] = useState<EngagementRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; planned: number; completed: number; missed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [form, setForm] = useState({ studentId: '', parentRelationship: 'FATHER', title: '', plannedAt: '', description: '', status: 'PLANNED' });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([fetchParentEngagementsMeta(), fetchParentEngagements()]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) =>
      setStudents(r.students.map((s) => ({ id: s.id, fullName: s.fullName, classGroup: s.classSection || `${s.className}-${s.sectionName}` }))),
    );
  }, []);

  const handleCreate = async () => {
    if (!form.studentId || !form.title || !form.plannedAt) return;
    try {
      await createParentEngagement({
        studentId: form.studentId,
        parentRelationship: form.parentRelationship,
        title: form.title,
        description: form.description,
        plannedAt: new Date(form.plannedAt).toISOString(),
        status: form.status,
      });
      setShowForm(false);
      setForm({ studentId: '', parentRelationship: 'FATHER', title: '', plannedAt: '', description: '', status: 'PLANNED' });
      setMessage('Engagement created.');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  const markComplete = async (r: EngagementRecord) => {
    await updateParentEngagement(r.id, { status: 'COMPLETED', completedAt: new Date().toISOString() });
    void load();
  };

  if (loading && !summary) return <ParentLoading label="Loading engagements…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parents Engagement"
        title="Parents Engagement"
        subtitle="Plan and track parent engagement events, outcomes, and follow-ups."
        actions={
          <button type="button" onClick={() => setShowForm(true)} className={pm.btnPrimary}>
            <Plus size={14} /> New Engagement
          </button>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

        {summary && (
          <ParentKpiGrid>
            <ParentKpiCard label="Total" value={summary.total} />
            <ParentKpiCard label="Planned" value={summary.planned} valueClassName="text-amber-600" />
            <ParentKpiCard label="Completed" value={summary.completed} valueClassName="text-emerald-600" />
            <ParentKpiCard label="Missed" value={summary.missed} valueClassName="text-red-600" />
          </ParentKpiGrid>
        )}

        <ParentTableCard title="Engagement Events" footer={`${records.length} event(s)`}>
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Title</th>
                <th className={pm.th}>Type</th>
                <th className={pm.th}>Planned</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400 text-sm">No engagements yet</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>{r.title}</td>
                  <td className={pm.td}>{r.engagementType || r.relationshipLabel}</td>
                  <td className={`${pm.td} text-slate-500 text-xs`}>{new Date(r.plannedAt).toLocaleString('en-IN')}</td>
                  <td className={pm.td}>
                    <span className={`${pm.badge} ${r.status === 'COMPLETED' ? pm.badgeGreen : r.status === 'MISSED' ? pm.badgeRed : pm.badgeAmber}`}>
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className={pm.td}>
                    {r.status === 'PLANNED' && (
                      <button type="button" onClick={() => void markComplete(r)} className="text-xs text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                        <CheckCircle size={12} /> Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal open={showForm} onClose={() => setShowForm(false)} title="New Engagement">
        <div className="space-y-3">
          <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={pm.selectFull}>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.classGroup})</option>)}
          </select>
          <select value={form.parentRelationship} onChange={(e) => setForm((f) => ({ ...f, parentRelationship: e.target.value }))} className={pm.selectFull}>
            <option value="FATHER">Father</option>
            <option value="MOTHER">Mother</option>
          </select>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={pm.input} />
          <input type="datetime-local" value={form.plannedAt} onChange={(e) => setForm((f) => ({ ...f, plannedAt: e.target.value }))} className={pm.input} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={pm.input} rows={2} />
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} />
      </ParentModal>
    </ParentPageShell>
  );
}
