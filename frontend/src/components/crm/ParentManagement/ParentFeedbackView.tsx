import { useCallback, useEffect, useState } from 'react';
import { Plus, Star } from 'lucide-react';
import {
  createParentFeedback, fetchParentFeedback, fetchParentFeedbackMeta, type FeedbackRecord,
} from '../../../lib/parentFeedbackServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

export function ParentFeedbackView() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; averageRating: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState({ studentId: '', parentRelationship: 'FATHER', parentName: '', rating: 4, category: 'general', message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([fetchParentFeedbackMeta(), fetchParentFeedback()]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) =>
      setStudents(r.students.map((s) => ({ id: s.id, fullName: s.fullName }))),
    );
  }, []);

  const handleCreate = async () => {
    if (!form.studentId || !form.message) return;
    await createParentFeedback(form);
    setShowForm(false);
    void load();
  };

  if (loading && !summary) return <ParentLoading label="Loading feedback…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Feedback"
        title="Parent Feedback"
        subtitle="Capture and review parent satisfaction ratings and comments."
        actions={
          <button type="button" onClick={() => setShowForm(true)} className={pm.btnPrimary}>
            <Plus size={14} /> Record Feedback
          </button>
        }
      />

      <div className={pm.content}>
        {summary && (
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <ParentKpiCard label="Total Feedback" value={summary.total} />
            <div className={pm.kpiCard}>
              <p className={pm.kpiLabel}>Avg Rating</p>
              <p className={`${pm.kpiValue} flex items-center gap-1.5 text-amber-600`}>
                {summary.averageRating.toFixed(1)} <Star size={20} className="fill-amber-400 text-amber-400" />
              </p>
            </div>
          </div>
        )}

        <ParentTableCard title="Feedback Records" footer={`${records.length} record(s)`}>
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Parent</th>
                <th className={pm.th}>Rating</th>
                <th className={pm.th}>Category</th>
                <th className={pm.th}>Message</th>
                <th className={pm.th}>Date</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>{r.parentName}</td>
                  <td className={pm.td}>{r.rating}/5</td>
                  <td className={pm.td}>{r.category}</td>
                  <td className={`${pm.td} max-w-xs truncate text-slate-500`}>{r.message}</td>
                  <td className={`${pm.td} text-xs text-slate-500`}>{new Date(r.submittedAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal open={showForm} onClose={() => setShowForm(false)} title="Record Feedback">
        <div className="space-y-3">
          <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={pm.selectFull}>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <input placeholder="Parent name" value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className={pm.input} />
          <div className="flex items-center gap-2 py-1">
            <span className="text-sm text-slate-600">Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rating: n }))} className={form.rating >= n ? 'text-amber-400' : 'text-slate-200'}>
                <Star size={22} className={form.rating >= n ? 'fill-amber-400' : ''} />
              </button>
            ))}
          </div>
          <textarea placeholder="Feedback message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={pm.input} rows={3} />
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} />
      </ParentModal>
    </ParentPageShell>
  );
}
