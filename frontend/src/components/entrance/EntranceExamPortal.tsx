import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Send,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import {
  fetchEntranceExam,
  fetchEntranceExamResult,
  getExamToken,
  loginEntranceExam,
  saveEntranceExamAnswers,
  setExamToken,
  submitEntranceExam,
  type ExamQuestion,
  type ExamResult,
  type ExamResultBreakdown,
} from '../../lib/entranceExamServices';

type Phase = 'login' | 'exam' | 'submitted';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function QuestionBlock({
  question,
  value,
  onChange,
  disabled,
}: {
  question: ExamQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const type = question.type;

  if (type === 'True/False') {
    return (
      <div className="flex gap-4 mt-3">
        {['True', 'False'].map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
              value === opt
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 hover:border-slate-300'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={disabled}
              className="accent-indigo-600"
            />
            <span className="text-sm font-medium">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === 'Multiple Choice' && question.options.length > 0) {
    return (
      <div className="space-y-2 mt-3">
        {question.options.map((opt, i) => (
          <label
            key={`${question.id}-${i}`}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              value === opt
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={disabled}
              className="mt-0.5 accent-indigo-600"
            />
            <span className="text-sm text-slate-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
      placeholder="Type your answer here…"
      className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
    />
  );
}

function BreakdownStatusIcon({ status }: { status: ExamResultBreakdown['status'] }) {
  if (status === 'correct') return <CheckCircle size={16} className="text-emerald-600 shrink-0" />;
  if (status === 'partial') return <MinusCircle size={16} className="text-amber-500 shrink-0" />;
  if (status === 'unanswered') return <AlertCircle size={16} className="text-slate-400 shrink-0" />;
  return <XCircle size={16} className="text-red-500 shrink-0" />;
}

function ResultScreen({ result }: { result: ExamResult }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div
            className={`px-8 py-6 text-center text-white ${
              result.passed ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-red-600 to-rose-600'
            }`}
          >
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              {result.passed ? <CheckCircle size={36} /> : <XCircle size={36} />}
            </div>
            <h1 className="text-2xl font-bold">{result.passed ? 'Congratulations — You Passed!' : 'Exam Completed'}</h1>
            <p className="text-sm opacity-90 mt-1">{result.testTitle}</p>
            <p className="text-xs opacity-75">{result.studentName}</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-[10px] font-semibold text-indigo-600 uppercase">Score</p>
                <p className="text-3xl font-bold text-indigo-700">{result.score}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Pass Marks</p>
                <p className="text-3xl font-bold text-slate-700">{result.passMarksRequired}%</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">Correct</p>
                <p className="text-3xl font-bold text-emerald-700">{result.correctCount}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-[10px] font-semibold text-red-600 uppercase">Wrong</p>
                <p className="text-3xl font-bold text-red-700">{result.wrongCount}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 text-center mb-6">{result.message}</p>

            <h2 className="text-sm font-bold text-slate-800 mb-3">Answer Review (auto-graded)</h2>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {result.breakdown.map((item, idx) => (
                <div
                  key={item.questionId}
                  className={`border rounded-lg p-3 text-sm ${
                    item.status === 'correct'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : item.status === 'partial'
                        ? 'border-amber-200 bg-amber-50/50'
                        : item.status === 'unanswered'
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex gap-2">
                    <BreakdownStatusIcon status={item.status} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">
                        Q{idx + 1}. {item.questionText}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase">{item.type}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p>
                          <span className="text-slate-500">Your answer: </span>
                          <span className="font-medium text-slate-800">
                            {item.givenAnswer || '(not answered)'}
                          </span>
                        </p>
                        {item.status !== 'correct' && item.correctAnswer && (
                          <p>
                            <span className="text-slate-500">Correct answer: </span>
                            <span className="font-medium text-emerald-700">{item.correctAnswer}</span>
                          </p>
                        )}
                        <p className="text-slate-400">
                          Points: {item.points}/{item.maxPoints}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center mt-6">
              Results are recorded with your application. You may close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntranceExamPortal() {
  const [phase, setPhase] = useState<Phase>('login');
  const [tokenNumber, setTokenNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testTitle, setTestTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const loadExam = useCallback(async () => {
    const data = await fetchEntranceExam();
    setTestTitle(data.testTitle);
    setStudentName(data.studentName);
    setQuestions(data.questions);
    setAnswers(data.answers || {});
    setDeadlineAt(data.deadlineAt);
    setPhase('exam');
  }, []);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      if (!auto && !confirm('Submit your exam? You cannot change answers after submission.')) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await submitEntranceExam(answersRef.current);
        setResult(res);
        setExamToken(null);
        setPhase('submitted');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed');
      } finally {
        setSubmitting(false);
      }
    },
    [submitting],
  );

  useEffect(() => {
    const resume = async () => {
      if (!getExamToken()) {
        setBooting(false);
        return;
      }
      try {
        await loadExam();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('already submitted') || msg.includes('Already submitted')) {
          try {
            const res = await fetchEntranceExamResult();
            setResult(res.result);
            setPhase('submitted');
          } catch {
            setExamToken(null);
          }
        } else {
          setExamToken(null);
        }
      } finally {
        setBooting(false);
      }
    };
    void resume();
  }, [loadExam]);

  useEffect(() => {
    if (phase !== 'exam' || !deadlineAt) return;
    const tick = () => {
      const ms = new Date(deadlineAt).getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        void handleSubmit(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, deadlineAt, handleSubmit]);

  const scheduleAutosave = (next: Record<string, string>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveEntranceExamAnswers(next).catch(() => {});
    }, 1200);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      scheduleAutosave(next);
      return next;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginEntranceExam(tokenNumber, pin);
      if ('result' in res) {
        setResult(res.result);
        setPhase('submitted');
        return;
      }
      setExamToken(res.sessionToken);
      await loadExam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setExamToken(null);
    setPhase('login');
    setTokenNumber('');
    setPin('');
    setQuestions([]);
    setAnswers({});
    setDeadlineAt(null);
    setError(null);
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (phase === 'submitted' && result) {
    return <ResultScreen result={result} />;
  }

  if (phase === 'exam') {
    const answered = Object.values(answers).filter((v) => v.trim()).length;
    const urgent = remainingMs < 5 * 60_000;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-800 truncate">{testTitle}</h1>
              <p className="text-xs text-slate-500 truncate">{studentName}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                  urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Clock size={14} />
                {formatCountdown(remainingMs)}
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {answered}/{questions.length} answered
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                title="Exit"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">{q.questionText}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{q.type}</p>
                  <QuestionBlock
                    question={q}
                    value={answers[q.id] || ''}
                    onChange={(v) => handleAnswerChange(q.id, v)}
                    disabled={submitting || remainingMs <= 0}
                  />
                </div>
              </div>
            </div>
          ))}
        </main>

        <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Answers autosave. Submit before time runs out.
            </p>
            <button
              type="button"
              disabled={submitting || remainingMs <= 0}
              onClick={() => void handleSubmit(false)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Exam
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-indigo-700 px-8 py-6 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-xl font-bold">Entrance Exam Portal</h1>
          <p className="text-indigo-200 text-sm mt-1">Enter your token and PIN to begin</p>
        </div>

        <form onSubmit={(e) => void handleLogin(e)} className="p-8 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Exam Token</label>
            <input
              type="text"
              value={tokenNumber}
              onChange={(e) => setTokenNumber(e.target.value.toUpperCase())}
              placeholder="ENT-2026-1234"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              maxLength={6}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Verifying…
              </>
            ) : (
              'Start Exam'
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Use the credentials provided by the school. Do not share your token or PIN.
          </p>
        </form>
      </div>
    </div>
  );
}
