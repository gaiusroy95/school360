import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Share2, Trash2 } from 'lucide-react';
import {
  createConsentTemplate,
  deleteConsentTemplate,
  fetchConsentTemplates,
  fetchConsentResponses,
  fetchImprovementPlanCandidates,
  isImprovementPlanTemplate,
  shareConsent,
  type ConsentTemplate,
  type ConsentResponse,
  type ImprovementPlanCandidate,
} from '../../../lib/parentConsentServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  ParentLoading, ParentModal, ParentModalActions, ParentPageHeader, ParentPageShell, pm,
} from './ParentManagementUi';

type ShareStudent = {
  id: string;
  fullName: string;
  classGroup: string;
  flags?: ('S' | 'B')[];
  studyScore?: number;
  behaviorScore?: number;
};

const DEFAULT_STUDY_THRESHOLD = 55;
const DEFAULT_BEHAVIOR_THRESHOLD = 60;

function FlagBadge({ flag }: { flag: 'S' | 'B' }) {
  const isStudy = flag === 'S';
  return (
    <span
      title={isStudy ? 'Study score below threshold' : 'Behavior score below threshold'}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
        isStudy ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-violet-100 text-violet-800 border border-violet-200'
      }`}
    >
      {flag}
    </span>
  );
}

export function ConsentManagementView() {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [shareModal, setShareModal] = useState<ConsentTemplate | null>(null);
  const [responses, setResponses] = useState<ConsentResponse[]>([]);
  const [allStudents, setAllStudents] = useState<ShareStudent[]>([]);
  const [improvementCandidates, setImprovementCandidates] = useState<ImprovementPlanCandidate[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studyThreshold, setStudyThreshold] = useState(DEFAULT_STUDY_THRESHOLD);
  const [behaviorThreshold, setBehaviorThreshold] = useState(DEFAULT_BEHAVIOR_THRESHOLD);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', academicYear: '2025-26' });
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isImprovementPlan = shareModal ? isImprovementPlanTemplate(shareModal) : false;

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
      setAllStudents(r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      }))),
    );
  }, []);

  const refreshImprovementCandidates = async (template: ConsentTemplate, study: number, behavior: number) => {
    setLoadingCandidates(true);
    try {
      const res = await fetchImprovementPlanCandidates({
        academicYear: template.academicYear,
        studyThreshold: study,
        behaviorThreshold: behavior,
      });
      setImprovementCandidates(res.candidates);
      setSelectedStudentIds(res.candidates.map((c) => c.studentId));
    } finally {
      setLoadingCandidates(false);
    }
  };

  const shareStudents = useMemo<ShareStudent[]>(() => {
    if (!isImprovementPlan) return allStudents;
    return improvementCandidates.map((c) => ({
      id: c.studentId,
      fullName: c.fullName,
      classGroup: c.classGroup,
      flags: c.flags,
      studyScore: c.studyScore,
      behaviorScore: c.behaviorScore,
    }));
  }, [allStudents, improvementCandidates, isImprovementPlan]);

  const handleCreate = async () => {
    if (!form.title) return;
    await createConsentTemplate(form);
    setShowForm(false);
    void load();
  };

  const openShare = async (t: ConsentTemplate) => {
    setShareModal(t);
    setSelectedStudentIds([]);
    const res = await fetchConsentResponses(t.id);
    setResponses(res.responses);

    if (isImprovementPlanTemplate(t)) {
      setLoadingCandidates(true);
      try {
        const planRes = await fetchImprovementPlanCandidates({ academicYear: t.academicYear });
        setStudyThreshold(planRes.defaults.studyThreshold);
        setBehaviorThreshold(planRes.defaults.behaviorThreshold);
        setImprovementCandidates(planRes.candidates);
        setSelectedStudentIds(planRes.candidates.map((c) => c.studentId));
      } finally {
        setLoadingCandidates(false);
      }
    }
  };

  const applyThresholds = async () => {
    if (!shareModal) return;
    await refreshImprovementCandidates(shareModal, studyThreshold, behaviorThreshold);
  };

  const handleShare = async () => {
    if (!shareModal || selectedStudentIds.length === 0) return;
    const res = await shareConsent(shareModal.id, selectedStudentIds);
    setMessage(res.message);
    setShareModal(null);
    setSelectedStudentIds([]);
    void load();
  };

  const handleDelete = async (t: ConsentTemplate) => {
    const confirmed = window.confirm(
      `Delete "${t.title}"?\n\nThis will permanently remove the consent template and all ${t.responseCount} associated response(s).`,
    );
    if (!confirmed) return;

    setDeletingId(t.id);
    try {
      const res = await deleteConsentTemplate(t.id);
      setMessage(res.message);
      if (shareModal?.id === t.id) setShareModal(null);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to delete consent');
    } finally {
      setDeletingId(null);
    }
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
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => void openShare(t)} className={pm.btnSecondary}>
                  <Share2 size={14} /> Share to Parents
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(t)}
                  disabled={deletingId === t.id}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 bg-white hover:bg-red-50 text-red-700 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> {deletingId === t.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
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
          <input placeholder="Category (e.g. Child Improvement plan)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={pm.input} />
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} confirmLabel="Create" />
      </ParentModal>

      <ParentModal open={!!shareModal} onClose={() => setShareModal(null)} title={`Share: ${shareModal?.title ?? ''}`} large>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
          Creates Pending responses — awaiting parent app approval
        </p>

        {isImprovementPlan && (
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              Auto-trigger — students below minimum thresholds appear here for improvement plan consent
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600 space-y-1">
                <span>Study score minimum (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={studyThreshold}
                  onChange={(e) => setStudyThreshold(Number(e.target.value))}
                  className={pm.input}
                />
              </label>
              <label className="text-xs text-slate-600 space-y-1">
                <span>Behavior score minimum (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={behaviorThreshold}
                  onChange={(e) => setBehaviorThreshold(Number(e.target.value))}
                  className={pm.input}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void applyThresholds()} className={pm.btnSecondary} disabled={loadingCandidates}>
                {loadingCandidates ? 'Applying…' : 'Apply thresholds'}
              </button>
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <FlagBadge flag="S" /> Study issue
                <FlagBadge flag="B" /> Behavioral issue
              </span>
            </div>
          </div>
        )}

        {loadingCandidates ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading eligible students…</p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 space-y-2">
            {shareStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {isImprovementPlan
                  ? 'No students below the current study / behavior thresholds.'
                  : 'No students found.'}
              </p>
            ) : (
              shareStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded-md px-2 py-1">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={(e) => setSelectedStudentIds((ids) => e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id))}
                  />
                  <span className="flex-1 min-w-0">
                    {s.fullName} ({s.classGroup})
                    {isImprovementPlan && s.studyScore != null && s.behaviorScore != null && (
                      <span className="text-xs text-slate-400 ml-1">
                        — Study {s.studyScore}% · Behavior {s.behaviorScore}%
                      </span>
                    )}
                  </span>
                  {s.flags && s.flags.length > 0 && (
                    <span className="flex items-center gap-1 shrink-0">
                      {s.flags.map((f) => <FlagBadge key={f} flag={f} />)}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}

        {isImprovementPlan && shareStudents.length > 0 && (
          <p className="text-xs text-slate-500">
            {selectedStudentIds.length} of {shareStudents.length} eligible student(s) selected
          </p>
        )}

        {responses.length > 0 && (
          <p className="text-xs text-slate-500">{responses.filter((r) => r.status === 'PENDING').length} pending of {responses.length} total</p>
        )}
        <ParentModalActions onCancel={() => setShareModal(null)} onConfirm={() => void handleShare()} confirmLabel="Share" />
      </ParentModal>
    </ParentPageShell>
  );
}
