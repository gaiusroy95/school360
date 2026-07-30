import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  fetchManualEntryMeta,
  submitManualEntranceEntry,
  type ManualEntryMeta,
  type MeritBadge,
  type MeritSubjectMark,
} from '../../../lib/meritListServices';

type SubjectRow = {
  id: string;
  name: string;
  maxMarks: string;
  obtainedMarks: string;
};

function emptySubjectRow(): SubjectRow {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: '',
    maxMarks: '50',
    obtainedMarks: '',
  };
}

function badgeClass(badge: MeritBadge | null) {
  if (badge === 'GOLD') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (badge === 'SILVER') return 'bg-slate-200 text-slate-700 border-slate-300';
  if (badge === 'BRONZE') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function ManualEntranceEntryPanel({ onSubmitted }: { onSubmitted: () => void }) {
  const [meta, setMeta] = useState<ManualEntryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [applicationDbId, setApplicationDbId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [classApplied, setClassApplied] = useState('');
  const [subjects, setSubjects] = useState<SubjectRow[]>([
    emptySubjectRow(),
    emptySubjectRow(),
    emptySubjectRow(),
  ]);

  useEffect(() => {
    void fetchManualEntryMeta()
      .then(setMeta)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load form options'))
      .finally(() => setLoading(false));
  }, []);

  const selectedStudent = useMemo(
    () => meta?.students.find((s) => s.applicationDbId === applicationDbId),
    [meta, applicationDbId],
  );

  useEffect(() => {
    if (selectedStudent?.classApplied) {
      setClassApplied(selectedStudent.classApplied);
    }
  }, [selectedStudent]);

  const preview = useMemo(() => {
    const active: MeritSubjectMark[] = subjects
      .filter((s) => s.name.trim() && Number(s.maxMarks) > 0)
      .map((s) => ({
        name: s.name.trim(),
        maxMarks: Number(s.maxMarks),
        obtainedMarks: Number(s.obtainedMarks || 0),
      }));

    const totalMax = active.reduce((sum, s) => sum + s.maxMarks, 0);
    const totalObtained = active.reduce((sum, s) => sum + s.obtainedMarks, 0);
    const percent = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const passMarks = meta?.defaultPassMarksPercent ?? 40;
    let badge: MeritBadge = 'NONE';
    if (percent >= 85) badge = 'GOLD';
    else if (percent >= 70) badge = 'SILVER';
    else if (percent >= passMarks) badge = 'BRONZE';

    return { active, totalMax, totalObtained, percent, badge, passMarks };
  }, [subjects, meta?.defaultPassMarksPercent]);

  const updateSubject = (id: string, patch: Partial<SubjectRow>) => {
    setSubjects((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addSubject = () => {
    if (subjects.length >= (meta?.maxSubjects ?? 6)) return;
    setSubjects((prev) => [...prev, emptySubjectRow()]);
  };

  const removeSubject = (id: string) => {
    setSubjects((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationDbId || !teacherName.trim()) {
      setError('Select student and teacher.');
      return;
    }
    if (preview.active.length === 0) {
      setError('Add at least one subject with max marks.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await submitManualEntranceEntry({
        applicationDbId,
        teacherName: teacherName.trim(),
        classApplied: classApplied.trim(),
        subjects: preview.active,
      });
      setSuccess(
        `Result published: ${res.percentScore}% — ${res.meritBadge} badge. Student will appear in the merit list.`,
      );
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit manual entrance test');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
        <Loader2 size={16} className="animate-spin" /> Loading manual entry form…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Award size={18} className="text-amber-600" />
          Manual Entrance Test Entry
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Record offline entrance test marks by subject. Totals adjust automatically based on selected
          subjects (e.g. 3 subjects × 50 = 150 max). Results publish to the merit list with Gold /
          Silver / Bronze badges.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student *</label>
            <select
              required
              value={applicationDbId}
              onChange={(e) => setApplicationDbId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select student…</option>
              {(meta?.students || []).map((s) => (
                <option key={s.applicationDbId} value={s.applicationDbId}>
                  {s.studentName} — {s.applicationId}
                  {s.hasManualEntry ? ' (update)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher *</label>
            <select
              required
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select teacher…</option>
              {(meta?.teachers || []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
            <select
              required
              value={classApplied}
              onChange={(e) => setClassApplied(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select class…</option>
              {(meta?.classes || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Subjects &amp; Marks (up to {meta?.maxSubjects ?? 6})
            </label>
            <button
              type="button"
              onClick={addSubject}
              disabled={subjects.length >= (meta?.maxSubjects ?? 6)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              <Plus size={12} /> Add Subject
            </button>
          </div>
          <div className="space-y-2">
            {subjects.map((row, index) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Subject {index + 1}</label>
                  <select
                    value={row.name}
                    onChange={(e) => updateSubject(row.id, { name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select subject…</option>
                    {(meta?.subjects || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={row.maxMarks}
                    onChange={(e) => updateSubject(row.id, { maxMarks: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Obtained</label>
                  <input
                    type="number"
                    min={0}
                    value={row.obtainedMarks}
                    onChange={(e) => updateSubject(row.id, { obtainedMarks: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSubject(row.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Remove subject"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase text-slate-500">Total Max</p>
            <p className="font-bold text-slate-800">{preview.totalMax || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Obtained</p>
            <p className="font-bold text-slate-800">{preview.totalObtained || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Percentage</p>
            <p className="font-bold text-indigo-700">{preview.totalMax ? `${preview.percent}%` : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Pass Marks</p>
            <p className="font-bold text-slate-800">{preview.passMarks}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Merit Badge</p>
            <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold border ${badgeClass(preview.badge)}`}>
              {preview.badge}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Publishing…' : 'Submit & Publish to Merit List'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function meritBadgeLabel(badge: MeritBadge | null) {
  if (!badge || badge === 'NONE') return null;
  return badge;
}

export function meritBadgeClass(badge: MeritBadge | null) {
  return badgeClass(badge);
}
