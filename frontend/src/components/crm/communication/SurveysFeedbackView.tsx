import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList, RefreshCw, Plus, Send, Star, BarChart2,
  Bell, X, Lock, CheckCircle2, Clock,
} from 'lucide-react';
import {
  fetchSurveysManagement,
  fetchSurveyDetail,
  createSurveyDraft,
  publishSurvey,
  closeSurvey,
  resendSurveyReminders,
  type SurveysManagement,
  type SurveyDetail,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager'];
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-blue-100 text-blue-800',
};

type QuestionDraft = {
  questionText: string;
  questionType: string;
  options: string;
  isRequired: boolean;
};

export function SurveysFeedbackView() {
  const [data, setData] = useState<SurveysManagement | null>(null);
  const [detail, setDetail] = useState<SurveyDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PTM_FEEDBACK');
  const [audienceType, setAudienceType] = useState('PARENT');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { questionText: 'How satisfied are you with the overall experience?', questionType: 'RATING', options: '', isRequired: true },
    { questionText: 'Any additional comments?', questionType: 'TEXT', options: '', isRequired: false },
  ]);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchSurveysManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await fetchSurveyDetail(id);
      setDetail(result);
      setSelectedId(id);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canPublish = data?.permissions.canPublish ?? false;

  const handleCreate = async () => {
    if (!title.trim()) { flash('Title is required.', 'error'); return; }
    if (questions.every((q) => !q.questionText.trim())) {
      flash('Add at least one question.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await createSurveyDraft({
        title, description, category, audienceType, isAnonymous,
        questions: questions
          .filter((q) => q.questionText.trim())
          .map((q, i) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
            isRequired: q.isRequired,
            sortOrder: i,
          })),
        academicYear, userRole,
      });
      setData(result.data);
      setShowCompose(false);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const result = await publishSurvey(id, { userRole, sendPush: true });
      setData(result.data);
      if (selectedId === id) await loadDetail(id);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  };

  const handleClose = async (id: string) => {
    try {
      const result = await closeSurvey(id, userRole);
      setData(result.data);
      if (selectedId === id) await loadDetail(id);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Close failed', 'error');
    }
  };

  const handleRemind = async (id: string) => {
    try {
      const result = await resendSurveyReminders(id, userRole);
      setData(result.data);
      setDetail(result.detail);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reminder failed', 'error');
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { questionText: '', questionType: 'RATING', options: '', isRequired: true }]);
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading && !data) return <AcademicLoading label="Loading surveys & feedback…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Surveys &amp; Feedback</h2>
          <p className="text-xs text-slate-500 mt-0.5">Structured feedback from parents, students &amp; staff — PTM surveys, evaluations &amp; more</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          {canPublish && (
            <button type="button" onClick={() => setShowCompose(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700">
              <Plus size={12} /> New Survey
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {[
          { label: 'Total Surveys', value: data?.kpis.totalSurveys ?? 0, color: 'text-slate-700' },
          { label: 'Active', value: data?.kpis.active ?? 0, color: 'text-green-600' },
          { label: 'Responses', value: data?.kpis.totalResponses ?? 0, color: 'text-blue-600' },
          { label: 'Response Rate', value: `${data?.kpis.avgResponseRate ?? 0}%`, color: 'text-purple-600' },
          { label: 'Pending', value: data?.kpis.pendingResponses ?? 0, color: 'text-amber-600' },
          { label: 'Drafts', value: data?.kpis.drafts ?? 0, color: 'text-slate-500' },
          { label: 'Closed', value: data?.kpis.closed ?? 0, color: 'text-indigo-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>
              {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
            </div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
        <div className={`${selectedId ? 'xl:col-span-2' : 'xl:col-span-5'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList size={14} className="text-teal-600" />
            <span className="text-xs font-bold text-slate-700">Surveys List</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Survey</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Category</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Audience</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Rate</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.surveys ?? []).map((s) => (
                  <tr key={s.id}
                    onClick={() => void loadDetail(s.id)}
                    className={`border-b border-slate-50 hover:bg-teal-50/40 cursor-pointer ${selectedId === s.id ? 'bg-teal-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        {s.isAnonymous && <Lock size={10} className="text-slate-400" />}
                        {s.title}
                      </div>
                      <div className="text-[10px] text-slate-400">{s.questionCount} questions · {s.responseCount}/{s.targetCount} responses</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-bold">{s.categoryLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{s.audienceLabel}</td>
                    <td className="px-3 py-2 text-right font-bold text-purple-700">
                      {s.status === 'ACTIVE' || s.status === 'CLOSED' ? `${s.responseRate}%` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[s.status] ?? ''}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
                {(data?.surveys ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No surveys yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedId && (
          <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {detailLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading…</div>
            ) : detail ? (
              <>
                <div className="px-3 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart2 size={14} className="text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">{detail.survey.title}</span>
                  </div>
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }}
                    className="p-1 hover:bg-slate-100 rounded"><X size={14} /></button>
                </div>

                <div className="p-3 border-b space-y-2">
                  <p className="text-xs text-slate-600">{detail.detail.description}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Target', value: detail.summary.targetCount },
                      { label: 'Responses', value: detail.summary.responseCount },
                      { label: 'Pending', value: detail.summary.pendingCount },
                      { label: 'Rate', value: `${detail.summary.responseRate}%` },
                    ].map((k) => (
                      <div key={k.label} className="text-center bg-slate-50 rounded p-1.5">
                        <div className="text-sm font-bold text-slate-800">{k.value}</div>
                        <div className="text-[9px] text-slate-500">{k.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.survey.status === 'DRAFT' && canPublish && (
                      <button type="button" onClick={() => void handlePublish(detail.survey.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg">
                        <Send size={12} /> Publish &amp; Push
                      </button>
                    )}
                    {detail.survey.status === 'ACTIVE' && detail.summary.pendingCount > 0 && canPublish && (
                      <button type="button" onClick={() => void handleRemind(detail.survey.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-amber-300 text-amber-800 bg-amber-50 rounded-lg">
                        <Bell size={12} /> Remind Pending ({detail.summary.pendingCount})
                      </button>
                    )}
                    {detail.survey.status === 'ACTIVE' && canPublish && (
                      <button type="button" onClick={() => void handleClose(detail.survey.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                        Close Survey
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 border-b overflow-y-auto max-h-[200px]">
                  <div className="text-[10px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <BarChart2 size={12} /> Question Analytics
                  </div>
                  <div className="space-y-3">
                    {detail.analytics.map((a) => (
                      <div key={a.questionId} className="bg-slate-50 rounded p-2">
                        <div className="text-xs font-semibold text-slate-800">{a.questionText}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{a.responseCount} responses</div>
                        {a.averageRating != null && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            <span className="text-sm font-bold text-amber-700">{a.averageRating}</span>
                            <span className="text-[10px] text-slate-400">/ 5 avg</span>
                          </div>
                        )}
                        {a.distribution && (
                          <div className="flex gap-1 mt-1">
                            {a.distribution.map((d) => (
                              <div key={d.value} className="text-center flex-1">
                                <div className="text-[10px] font-bold">{d.count}</div>
                                <div className="text-[9px] text-slate-400">{d.value}★</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.optionCounts && (
                          <div className="mt-1 space-y-0.5">
                            {a.optionCounts.map((o) => (
                              <div key={o.option} className="flex justify-between text-[10px]">
                                <span>{o.option}</span>
                                <span className="font-bold">{o.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.yesCount != null && (
                          <div className="text-[10px] mt-1 text-green-700">Yes: {a.yesCount} · No: {a.noCount}</div>
                        )}
                        {a.textResponses && a.textResponses.length > 0 && (
                          <div className="mt-1 text-[10px] text-slate-600 italic">
                            &ldquo;{a.textResponses[0]}&rdquo;
                            {a.textResponses.length > 1 && ` (+${a.textResponses.length - 1} more)`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden min-h-[120px]">
                  <div className="border-r overflow-y-auto">
                    <div className="px-3 py-1.5 bg-green-50 border-b flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="text-[10px] font-bold text-green-800">Completed ({detail.completed.length})</span>
                    </div>
                    {detail.completed.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                        <div className="font-semibold">{r.accountName}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN') : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-y-auto">
                    <div className="px-3 py-1.5 bg-amber-50 border-b flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-800">Pending ({detail.pending.length})</span>
                    </div>
                    {detail.pending.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                        <div className="font-semibold">{r.accountName}</div>
                        <div className="text-[10px] text-slate-400">{r.accountRole}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold">Create Survey</h3>
              <button type="button" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-0.5 text-xs border rounded px-2 py-1.5" placeholder="PTM Feedback Survey" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="w-full mt-0.5 text-xs border rounded px-2 py-1.5 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-0.5 text-xs border rounded px-2 py-1.5 bg-white">
                    {(data?.categories ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Audience</label>
                  <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}
                    className="w-full mt-0.5 text-xs border rounded px-2 py-1.5 bg-white">
                    {(data?.audienceOptions ?? []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                <span className="font-semibold">Anonymous responses</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Questions</label>
                  <button type="button" onClick={addQuestion} className="text-[10px] text-teal-600 font-bold">+ Add</button>
                </div>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="border rounded p-2 space-y-1">
                      <input value={q.questionText} onChange={(e) => updateQuestion(i, { questionText: e.target.value })}
                        className="w-full text-xs border rounded px-2 py-1" placeholder="Question text" />
                      <div className="flex gap-2">
                        <select value={q.questionType} onChange={(e) => updateQuestion(i, { questionType: e.target.value })}
                          className="flex-1 text-[10px] border rounded px-1 py-1 bg-white">
                          {(data?.questionTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(i)} className="text-[10px] text-red-500">Remove</button>
                        )}
                      </div>
                      {(q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTI_CHOICE') && (
                        <input value={q.options} onChange={(e) => updateQuestion(i, { options: e.target.value })}
                          className="w-full text-[10px] border rounded px-2 py-1" placeholder="Options (comma-separated)" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCompose(false)}
                  className="flex-1 px-3 py-2 text-xs border rounded-lg">Cancel</button>
                <button type="button" onClick={() => void handleCreate()} disabled={saving}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100 p-3">
        <div className="text-xs font-bold text-teal-800 mb-2">Feedback Collection Workflow</div>
        <div className="flex flex-wrap gap-2">
          {(data?.workflowSteps ?? []).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className="text-[10px] bg-white border border-teal-200 rounded-full px-2 py-0.5 text-teal-700 font-medium">
                {i + 1}. {step}
              </span>
              {i < (data?.workflowSteps.length ?? 0) - 1 && <span className="text-teal-300">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
