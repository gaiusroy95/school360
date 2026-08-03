import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Lock, User } from 'lucide-react';
import { BrandLogo } from '../shared/BrandLogo';
import { api } from '../../lib/api';
import { APP_NAME } from '../../lib/branding';

type ExamInfo = {
  live: boolean;
  paperId?: string;
  title?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  durationMinutes?: number;
  passMarksPercent?: number;
  questionCount?: number;
  purposeLabel?: string;
  message?: string;
};

type AttemptPayload = {
  attemptId: string;
  durationMinutes: number;
  passMarksPercent: number;
  studentName?: string;
  userId?: string;
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
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  rawScore?: number;
  maxScore?: number;
  paperTitle?: string;
};

function getTokenFromPath() {
  const m = window.location.pathname.match(/^\/paper-exam\/([^/]+)/);
  return m?.[1] || '';
}

export function PaperExamPortal() {
  const token = useMemo(() => getTokenFromPath(), []);
  const [info, setInfo] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
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
      const data = await api<ExamInfo>(`/api/examination/paper-management/exam-link/${token}`);
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

  const login = async () => {
    if (!userId.trim() || !password.trim()) {
      setError('Enter User ID and Password');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<AttemptPayload>(`/api/examination/paper-management/exam-link/${token}/login`, {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim(), password: password.trim() }),
      });
      setAttempt(data);
      setRemainingMs(data.durationMinutes * 60 * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api<SubmitResult>(`/api/examination/paper-management/exam-link/${token}/submit`, {
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
            <h1 className="text-sm font-bold text-slate-800">Paper Exam (Digital)</h1>
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
              <h2 className="text-xl font-bold text-slate-900">{info.title || 'Digital Exam'}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {[info.subjectName, info.className && `${info.className}${info.sectionName ? ` — ${info.sectionName}` : ''}`, info.purposeLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Duration {info.durationMinutes} min · {info.questionCount} questions · Pass {info.passMarksPercent}%
              </p>
            </div>
            <p className="text-sm text-slate-600">{info.message || 'Enter your User ID and Password to start.'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  <User size={12} /> User ID
                </label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Admission / Roll number"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  <Lock size={12} /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Exam password"
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === 'Enter') void login(); }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void login()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Start Digital Exam
            </button>
          </div>
        )}

        {attempt && !result && (
          <div className="space-y-4">
            {attempt.studentName && (
              <p className="text-sm text-slate-600">
                Taking as <span className="font-semibold text-slate-900">{attempt.studentName}</span>
                {attempt.userId ? ` (${attempt.userId})` : ''}
              </p>
            )}
            {attempt.questions.map((q, idx) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  Q{idx + 1}. {q.questionText}
                </p>
                {q.options?.length ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const label = String.fromCharCode(65 + oi);
                      const selected = answers[q.id] === opt || answers[q.id] === label;
                      return (
                        <label
                          key={`${q.id}-${oi}`}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                            selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            className="mt-1"
                            checked={selected}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          <span>({label}) {opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Your answer"
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Submit &amp; View Result
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-3">
            <CheckCircle2 size={44} className={result.passed ? 'mx-auto text-green-600' : 'mx-auto text-amber-500'} />
            <h2 className="text-xl font-bold text-slate-900">
              {result.passed ? 'Passed' : 'Completed'} — {result.score}%
            </h2>
            <p className="text-sm text-slate-600">
              Correct {result.correctCount} · Wrong {result.wrongCount} · Unanswered {result.unansweredCount}
            </p>
            <p className="text-xs text-slate-500">
              Result is synced to Exam Results / Marks Entry for your class paper.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
