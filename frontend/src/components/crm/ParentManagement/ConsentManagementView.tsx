import { useCallback, useEffect, useState } from 'react';
import { Plus, Share2 } from 'lucide-react';
import {
  createConsentTemplate, fetchConsentTemplates, fetchConsentResponses, shareConsent,
  type ConsentTemplate, type ConsentResponse,
} from '../../../lib/parentConsentServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  ParentLoading, ParentModal, ParentModalActions, ParentPageHeader, ParentPageShell, pm,
} from './ParentManagementUi';

export function ConsentManagementView() {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [shareModal, setShareModal] = useState<ConsentTemplate | null>(null);
  const [responses, setResponses] = useState<ConsentResponse[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', academicYear: '2025-26' });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConsentTemplates();
      setTemplates(res.templates);
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
    if (!form.title) return;
    await createConsentTemplate(form);
    setShowForm(false);
    void load();
  };

  const openShare = async (t: ConsentTemplate) => {
    setShareModal(t);
    const res = await fetchConsentResponses(t.id);
    setResponses(res.responses);
  };

  const handleShare = async () => {
    if (!shareModal || selectedStudentIds.length === 0) return;
    const res = await shareConsent(shareModal.id, selectedStudentIds);
    setMessage(res.message);
    setShareModal(null);
    setSelectedStudentIds([]);
    void load();
  };

  if (loading) return <ParentLoading label="Loading consent templates…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Consent Management"
        title="Consent Management"
        subtitle="Create consent templates and share to parents. Responses remain pending until the parent app is available."
        actions={
          <button type="button" onClick={() => setShowForm(true)} className={pm.btnPrimary}>
            <Plus size={14} /> New Template
          </button>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 max-w-2xl">
          Awaiting parent app approval — all shared responses stay <strong>Pending</strong>.
        </p>

        <div className="grid gap-4">
          {templates.map((t) => (
            <div key={t.id} className={`${pm.card} ${pm.cardPad} flex flex-col sm:flex-row sm:items-start justify-between gap-4`}>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{t.title}</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                <p className="text-xs text-slate-400 mt-2">{t.category} · {t.academicYear} · {t.responseCount} response(s)</p>
              </div>
              <button type="button" onClick={() => void openShare(t)} className={pm.btnSecondary}>
                <Share2 size={14} /> Share to Parents
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div className={`${pm.card} ${pm.cardPad} text-center text-slate-400 py-12`}>No consent templates yet</div>
          )}
        </div>
      </div>

      <ParentModal open={showForm} onClose={() => setShowForm(false)} title="New Consent Template">
        <div className="space-y-3">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={pm.input} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={pm.input} rows={2} />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={pm.input} />
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} confirmLabel="Create" />
      </ParentModal>

      <ParentModal open={!!shareModal} onClose={() => setShareModal(null)} title={`Share: ${shareModal?.title ?? ''}`} large>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
          Creates Pending responses — awaiting parent app approval
        </p>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 space-y-2">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded-md px-2 py-1">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={selectedStudentIds.includes(s.id)}
                onChange={(e) => setSelectedStudentIds((ids) => e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id))}
              />
              {s.fullName} ({s.classGroup})
            </label>
          ))}
        </div>
        {responses.length > 0 && (
          <p className="text-xs text-slate-500">{responses.filter((r) => r.status === 'PENDING').length} pending of {responses.length} total</p>
        )}
        <ParentModalActions onCancel={() => setShareModal(null)} onConfirm={() => void handleShare()} confirmLabel="Share" />
      </ParentModal>
    </ParentPageShell>
  );
}
