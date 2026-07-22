import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, FileQuestion, Filter, Loader2, MonitorPlay,
  RefreshCw, ScanLine, Sparkles, Trash2, UploadCloud, XCircle,
} from 'lucide-react';
import {
  createQuestionPaper, deleteQuestionPaper, fetchDigitalExamAttempts,
  fetchQuestionBankMeta, fetchQuestionPapers, fileToBase64,
  generateQuestionPaperFromPdf, generateQuestionPaperFromSyllabus,
  scanQuestionPaperOcr, seedQuestionBank, startDigitalExam, submitDigitalExam,
  type Difficulty, type ExamPaperPurpose, type ExamPaperSource,
  type QuestionInput, type QuestionPaperSummary, type QuestionType,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type CreateTab = 'ocr' | 'ai' | 'syllabus';
type ReviewState = {
  title: string;
  source: ExamPaperSource;
  questions: QuestionInput[];
  fileMeta?: unknown[];
  rawOcrText?: string;
};

const PURPOSE_COLORS: Partial<Record<ExamPaperPurpose, string>> = {
  CLASS_TEST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UNIT_TEST: 'bg-blue-100 text-blue-800 border-blue-200',
  MID_TERM: 'bg-amber-100 text-amber-800 border-amber-200',
  ANNUAL_EXAM: 'bg-purple-100 text-purple-800 border-purple-200',
  ENTRANCE_TEST: 'bg-red-100 text-red-800 border-red-200',
  PRACTICE: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function QuestionBankView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchQuestionBankMeta>> | null>(null);
  const [papers, setPapers] = useState<QuestionPaperSummary[]>([]);
  const [summary, setSummary] = useState({ totalPapers: 0, totalQuestions: 0, published: 0, digitalExams: 0 });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [purpose, setPurpose] = useState('all');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createTab, setCreateTab] = useState<CreateTab>('ocr');
  const [numQuestions, setNumQuestions] = useState(20);
  const [questionType, setQuestionType] = useState<QuestionType>('Multiple Choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [paperPurpose, setPaperPurpose] = useState<ExamPaperPurpose>('UNIT_TEST');
  const [paperTitle, setPaperTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passMarks, setPassMarks] = useState(33);
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File; name: string }[]>([]);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [digitalExam, setDigitalExam] = useState<{
    attemptId: string;
    paperTitle: string;
    questions: { id: string; questionText: string; options: string[]; type: string }[];
    answers: Record<string, string>;
    passMarksPercent: number;
  } | null>(null);
  const [examResult, setExamResult] = useState<Awaited<ReturnType<typeof submitDigitalExam>> | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchQuestionBankMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = meta ? academicYear : m.defaultAcademicYear;
      let data = await fetchQuestionPapers({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
        subjectName: subjectName || undefined,
        purpose: purpose !== 'all' ? purpose : undefined,
      });
      if (!data.papers.length) {
        await seedQuestionBank(yearFilter);
        data = await fetchQuestionPapers({
          academicYear: yearFilter,
          className: className || undefined,
          sectionName: sectionName || undefined,
          subjectName: subjectName || undefined,
          purpose: purpose !== 'all' ? purpose : undefined,
        });
      }
      setPapers(data.papers);
      setSummary(data.summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName, subjectName, purpose]);

  useEffect(() => { void load(); }, [load]);

  const addFiles = (files: FileList | File[]) => {
    const allowed = Array.from(files).filter((f) => {
      const n = f.name.toLowerCase();
      return f.type.startsWith('image/') || f.type === 'application/pdf' || n.endsWith('.pdf') || n.endsWith('.jpg') || n.endsWith('.png');
    });
    if (!allowed.length) { setErrorMsg('Upload PDF or image files'); return; }
    setPendingFiles((prev) => [...prev, ...allowed.map((file) => ({ id: `${file.name}-${Date.now()}`, file, name: file.name }))]);
  };

  const runOcr = async () => {
    if (!className || !subjectName) { setErrorMsg('Select class and subject first'); return; }
    if (!pendingFiles.length) { setErrorMsg('Upload scan files'); return; }
    setCreating(true);
    setErrorMsg(null);
    try {
      const files = await Promise.all(pendingFiles.map((f) => fileToBase64(f.file)));
      const res = await scanQuestionPaperOcr({ title: paperTitle || undefined, files, questionType, difficulty });
      setReview({ title: res.suggestedTitle, source: 'OCR', questions: res.questions, fileMeta: res.fileMeta, rawOcrText: res.rawOcrText });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'OCR failed');
    } finally { setCreating(false); }
  };

  const runAiPdf = async () => {
    if (!className || !subjectName) { setErrorMsg('Select class and subject first'); return; }
    if (!pendingFiles.length) { setErrorMsg('Upload PDF textbook files'); return; }
    setCreating(true);
    try {
      const files = await Promise.all(pendingFiles.map((f) => fileToBase64(f.file)));
      const res = await generateQuestionPaperFromPdf({ title: paperTitle || undefined, files, numQuestions, questionType, difficulty });
      setReview({ title: res.suggestedTitle, source: 'AI_PDF', questions: res.questions, fileMeta: res.fileMeta });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI generation failed');
    } finally { setCreating(false); }
  };

  const runSyllabus = async () => {
    if (!className || !subjectName) { setErrorMsg('Select class and subject first'); return; }
    setCreating(true);
    try {
      const res = await generateQuestionPaperFromSyllabus({
        academicYear, className, sectionName: sectionName || undefined, subjectName,
        purpose: paperPurpose, numQuestions, questionType, difficulty, title: paperTitle || undefined,
      });
      setReview({ title: res.suggestedTitle, source: 'SYLLABUS', questions: res.questions });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Syllabus generation failed');
    } finally { setCreating(false); }
  };

  const savePaper = async (publish = false) => {
    if (!review || !className || !subjectName) return;
    setCreating(true);
    try {
      await createQuestionPaper({
        academicYear, className, sectionName: sectionName || undefined, subjectName,
        title: review.title, purpose: paperPurpose, source: review.source,
        durationMinutes, questionType, difficulty, passMarksPercent: passMarks,
        isDigitalExam: true, sourceFilesMeta: review.fileMeta, status: publish ? 'PUBLISHED' : 'DRAFT',
        questions: review.questions,
      });
      setReview(null);
      setPendingFiles([]);
      setPaperTitle('');
      setSuccessMsg(`Question paper saved${publish ? ' and published' : ''}`);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question paper?')) return;
    await deleteQuestionPaper(id);
    setSuccessMsg('Paper deleted');
    await load();
  };

  const openDigitalExam = async (paper: QuestionPaperSummary) => {
    setExamResult(null);
    try {
      const res = await startDigitalExam(paper.id, { candidateName: 'Demo Student', candidateRef: 'DEMO-001' });
      setDigitalExam({
        attemptId: res.attemptId,
        paperTitle: res.paper.title,
        questions: res.questions,
        answers: {},
        passMarksPercent: res.passMarksPercent,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not start digital exam');
    }
  };

  const submitExam = async () => {
    if (!digitalExam) return;
    setSubmittingExam(true);
    try {
      const result = await submitDigitalExam(digitalExam.attemptId, digitalExam.answers);
      setExamResult(result);
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally { setSubmittingExam(false); }
  };

  if (loading && !papers.length) return <AcademicLoading label="Loading question bank…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Question Bank"
        title="Question Bank"
        subtitle="AI/OCR question paper creation by class, section & subject — unlimited papers including entrance tests with digital auto-scoring"
        actions={(
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      />

      <div className={am.content}>
        {errorMsg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
        {successMsg && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{successMsg}</p>}

        <div className={am.filterBar}>
          <Filter size={14} className="text-slate-400" />
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
            {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={am.select}>
            <option value="">Select Class *</option>
            {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className={am.select}>
            <option value="">Select Subject *</option>
            {(meta?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={am.select}>
            <option value="all">All Paper Types</option>
            {(meta?.purposes || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-slate-500 uppercase">Papers</p><p className="text-2xl font-bold">{summary.totalPapers}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-blue-600 uppercase">Questions</p><p className="text-2xl font-bold">{summary.totalQuestions}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-green-600 uppercase">Published</p><p className="text-2xl font-bold">{summary.published}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-purple-600 uppercase">Digital Exams</p><p className="text-2xl font-bold">{summary.digitalExams}</p></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
          <div className={`${am.card} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
              <FileQuestion size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Question Papers</h3>
              <span className="text-[10px] text-slate-500 ml-auto">{papers.length} paper(s)</span>
            </div>
            {papers.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">No papers yet. Create one using AI/OCR on the right.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {papers.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.classGroup} · {p.subjectName}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PURPOSE_COLORS[p.purpose] || ''}`}>{p.purposeLabel}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{p.sourceLabel}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{p.questionCount} Q · {p.durationMinutes} min</span>
                          {p.isDigitalExam && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Digital</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {p.isDigitalExam && (
                          <button type="button" onClick={() => void openDigitalExam(p)} className="p-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50" title="Take Digital Exam">
                            <MonitorPlay size={14} />
                          </button>
                        )}
                        <button type="button" onClick={() => void handleDelete(p.id)} className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${am.card} ${am.cardPad} space-y-4`}>
            <h3 className="text-sm font-bold text-slate-800">Create Question Paper</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Paper Type</label>
                <select value={paperPurpose} onChange={(e) => setPaperPurpose(e.target.value as ExamPaperPurpose)} className={`${am.select} w-full mt-1`}>
                  {(meta?.purposes || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Duration (min)</label>
                <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={`${am.input} mt-1`} />
              </div>
            </div>
            <input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} placeholder="Paper title (optional)" className={am.input} />
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {(['ocr', 'ai', 'syllabus'] as CreateTab[]).map((tab) => (
                <button key={tab} type="button" onClick={() => setCreateTab(tab)}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md ${createTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                  {tab === 'ocr' ? 'OCR Scan' : tab === 'ai' ? 'AI from PDF' : 'From Syllabus'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className={am.select}>
                {(meta?.questionTypes || ['Multiple Choice']).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={am.select}>
                {(meta?.difficulties || ['Medium']).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {createTab !== 'syllabus' && (
              <>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                >
                  <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs text-slate-600">{createTab === 'ocr' ? 'Drop scan images or PDF' : 'Drop textbook PDFs'}</p>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
                </div>
                {pendingFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== f.id))}><XCircle size={12} /></button>
                  </div>
                ))}
              </>
            )}
            {createTab === 'syllabus' && (
              <div className="flex gap-2">
                <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className={am.input} min={1} max={100} />
                <span className="text-xs text-slate-500 self-center">questions</span>
              </div>
            )}
            {createTab !== 'syllabus' && (
              <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className={am.input} placeholder="Number of questions" min={1} max={100} />
            )}
            <div className="flex gap-2">
              <input type="number" value={passMarks} onChange={(e) => setPassMarks(Number(e.target.value))} className={am.input} placeholder="Pass %" min={0} max={100} />
              <span className="text-xs text-slate-500 self-center">pass marks</span>
            </div>
            <button
              type="button"
              disabled={creating || !className || !subjectName}
              onClick={() => void (createTab === 'ocr' ? runOcr() : createTab === 'ai' ? runAiPdf() : runSyllabus())}
              className={`${am.btnPrimary} w-full`}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : createTab === 'ocr' ? <ScanLine size={14} /> : createTab === 'ai' ? <Sparkles size={14} /> : <BookOpen size={14} />}
              {createTab === 'ocr' ? 'Scan with OCR' : createTab === 'ai' ? 'Generate with AI' : 'Generate from Syllabus'}
            </button>
            {(!className || !subjectName) && (
              <p className="text-[10px] text-amber-700">Select class and subject in filters above to create papers.</p>
            )}
          </div>
        </div>
      </div>

      <AcademicModal open={!!review} onClose={() => setReview(null)} title="Review Questions" large>
        {review && (
          <div className="space-y-4">
            <input value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} className={am.input} />
            <p className="text-xs text-slate-500">{review.questions.length} questions · Source: {review.source}</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {review.questions.map((q, i) => (
                <div key={i} className="p-2 rounded border border-slate-100 text-xs">
                  <p className="font-semibold">Q{i + 1}. {q.questionText}</p>
                  {q.options?.length ? <p className="text-slate-500 mt-1">{q.options.join(' · ')}</p> : null}
                  {q.correctAnswer && <p className="text-green-700 mt-0.5">Answer: {q.correctAnswer}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void savePaper(false)} disabled={creating} className={am.btnSecondary}>Save Draft</button>
              <button type="button" onClick={() => void savePaper(true)} disabled={creating} className={am.btnPrimary}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Publish Paper
              </button>
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={!!digitalExam} onClose={() => { setDigitalExam(null); setExamResult(null); }} title={digitalExam?.paperTitle || 'Digital Exam'} large>
        {digitalExam && !examResult && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Auto-scoring enabled for MCQ, True/False & Short Answer. Pass: {digitalExam.passMarksPercent}%</p>
            {digitalExam.questions.map((q, i) => (
              <div key={q.id} className="p-3 rounded-lg border border-slate-200">
                <p className="text-sm font-semibold mb-2">Q{i + 1}. {q.questionText}</p>
                {q.options.length > 0 ? (
                  <div className="space-y-1">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name={q.id} checked={digitalExam.answers[q.id] === opt}
                          onChange={() => setDigitalExam({ ...digitalExam, answers: { ...digitalExam.answers, [q.id]: opt } })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input value={digitalExam.answers[q.id] || ''} onChange={(e) => setDigitalExam({ ...digitalExam, answers: { ...digitalExam.answers, [q.id]: e.target.value } })}
                    className={am.input} placeholder="Your answer" />
                )}
              </div>
            ))}
            <button type="button" onClick={() => void submitExam()} disabled={submittingExam} className={`${am.btnPrimary} w-full`}>
              {submittingExam ? <Loader2 size={14} className="animate-spin" /> : null} Submit & Auto-Score
            </button>
          </div>
        )}
        {examResult && (
          <div className="space-y-3 text-center">
            <div className={`text-4xl font-bold ${examResult.passed ? 'text-green-600' : 'text-red-600'}`}>{examResult.score}%</div>
            <p className="text-sm font-semibold">{examResult.message}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-green-50 rounded"><span className="font-bold text-green-700">{examResult.correctCount}</span> Correct</div>
              <div className="p-2 bg-red-50 rounded"><span className="font-bold text-red-700">{examResult.wrongCount}</span> Wrong</div>
              <div className="p-2 bg-slate-50 rounded"><span className="font-bold">{examResult.unansweredCount}</span> Skipped</div>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
