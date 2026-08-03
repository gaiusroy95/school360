import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Send } from 'lucide-react';
import { BrandLogo } from '../shared/BrandLogo';
import { api } from '../../lib/api';
import { APP_NAME } from '../../lib/branding';

type ExamInfo = {
  live: boolean;
  publishAt?: string | null;
  seriesName?: string;
  subjectName?: string;
  className?: string;
  sectionName?: string;
  examDate?: string;
  title?: string;
  paperId?: string;
  durationMinutes?: number;
  passMarksPercent?: number;
  questionCount?: number;
  message?: string;
};

type AttemptPayload = {
  attemptId: string;
  durationMinutes: number;
  passMarksPercent: number;
  questions: {
    id: string;
    sortOrder: number;
    type: string;
    questionText: string;
    options: string[];
  }[];
};

type SubmitResult = {
  score: number;
  passed: boolean;
  message: string;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
};

function getTokenFromPath() {
  const m = window.location.pathname.match(/^\/exam\/([^/]+)/);
  return m?.[1] || '';
}

export function DigitalExamTakePortal() {
  const token = useMemo(() => getTokenFromPath(), []);
  const [info, setInfo] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ref, setRef] = useState('');
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Invalid exam link');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<ExamInfo>(`/api/examination/schedule/exam-link/${token}`);
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!attempt || remainingMs == null) return;
    if (remainingMs <= 0) return;
    const t = window.setInterval(() => {
      setRemainingMs((ms) => (ms == null ? ms : Math.max(0, ms - 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [attempt, remainingMs]);

  const start = async () => {
    if (!name.trim()) {
      setError('Enter your name to start');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<AttemptPayload>(`/api/examination/schedule/exam-link/${token}/start`, {
        method: 'POST',
        body: JSON.stringify({ candidateName: name.trim(), candidateRef: ref.trim() }),
      });
      setAttempt(data);
      setRemainingMs(data.durationMinutes * 60 * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start exam');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<SubmitResult>(`/api/examination/schedule/exam-link/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({ attemptId: attempt.attemptId, answers }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (remainingMs === 0 && attempt && !result && !submitting) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  const mm = remainingMs != null ? Math.floor(remainingMs / 60000) : 0;
  const ss = remainingMs != null ? Math.floor((remainingMs % 60000) / 1000) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-auto object-contain" />
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{APP_NAME}</p>
            <h1 className="text-sm font-bold text-slate-800">Digital Examination</h1>
          </div>
        </div>
        {attempt && !result && remainingMs != null && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-900">
            <Clock size={14} />
            <span className="text-sm font-bold tabular-nums">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
            <Loader2 className="animate-spin" size={28} />
            <p className="text-sm">Loading exam…</p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!loading && info && !attempt && !result && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{info.title || info.seriesName || 'Examination'}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {[info.subjectName, info.className && `${info.className}-${info.sectionName}`, info.examDate].filter(Boolean).join(' · ')}
              </p>
            </div>

            {!info.live ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Exam not published yet</p>
                <p className="mt-1">{info.message}</p>
                {info.publishAt && (
                  <p className="mt-1 text-xs">Opens at: {new Date(info.publishAt).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Duration {info.durationMinutes} min · {info.questionCount} questions · Pass {info.passMarksPercent}%
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Student name" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Admission / Roll No</label>
                    <input value={ref} onChange={(e) => setRef(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  Start Exam
                </button>
              </>
            )}
          </div>
        )}

        {attempt && !result && (
          <div className="space-y-4">
            {attempt.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Q{i + 1}. {q.questionText}</p>
                {q.options.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Your answer"
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-3 text-sm font-bold text-white"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit &amp; Auto-Score
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-3">
            <CheckCircle2 className={`mx-auto ${result.passed ? 'text-emerald-500' : 'text-red-500'}`} size={40} />
            <p className={`text-4xl font-black ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>{result.score}%</p>
            <p className="text-sm font-semibold text-slate-700">{result.message}</p>
            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
              <div className="rounded-lg bg-emerald-50 p-2"><span className="font-bold text-emerald-700">{result.correctCount}</span> Correct</div>
              <div className="rounded-lg bg-red-50 p-2"><span className="font-bold text-red-700">{result.wrongCount}</span> Wrong</div>
              <div className="rounded-lg bg-slate-50 p-2"><span className="font-bold">{result.unansweredCount}</span> Skipped</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
