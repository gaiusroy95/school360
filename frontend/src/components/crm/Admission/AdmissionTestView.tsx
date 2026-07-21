import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileQuestion,
  Settings,
  Clock,
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  FileText,
  Sparkles,
  Pencil,
  ScanLine,
  Send,
  Users,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  fetchAdmissionTests,
  fetchAdmissionTestMeta,
  fetchAdmissionTest,
  generateQuestionsFromPdf,
  scanTestWithOcr,
  createAdmissionTest,
  updateAdmissionTest,
  deleteAdmissionTest,
  publishAdmissionTest,
  fetchTestPublication,
  fetchAdmissionTestSettings,
  updateAdmissionTestSettings,
  fileToBase64,
  type AdmissionTestSummary,
  type TestQuestionInput,
  type QuestionType,
  type Difficulty,
  type TestSource,
  type OcrPreviewFile,
  type TestPublication,
} from '../../../lib/admissionTestServices';
import { fetchApplications, type Application } from '../../../lib/applicationServices';

type RightTab = 'syllabus' | 'pdf' | 'ocr';

type PendingFile = {
  id: string;
  file: File;
  name: string;
};

type ReviewState = {
  mode: 'create' | 'edit';
  testId?: string;
  source: TestSource;
  title: string;
  durationMinutes: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  numQuestions: number;
  fileMeta: unknown[];
  questions: TestQuestionInput[];
  previewFiles?: OcrPreviewFile[];
  previewIndex?: number;
  rawOcrText?: string;
  passMarksPercent?: number | null;
};

type PublishModalState = {
  testId: string;
  testTitle: string;
  defaultDuration: number;
};

type VisibilityOption = 'Website' | 'Mobile App' | 'Website & Mobile App';

function toDatetimeLocalValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdmissionTestView() {
  const [tests, setTests] = useState<AdmissionTestSummary[]>([]);
  const [meta, setMeta] = useState<{ questionTypes: QuestionType[]; difficulties: Difficulty[] }>({
    questionTypes: ['Multiple Choice', 'True/False', 'Short Answer'],
    difficulties: ['Easy', 'Medium', 'Hard'],
  });
  const [rightTab, setRightTab] = useState<RightTab>('pdf');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [numQuestions, setNumQuestions] = useState(50);
  const [questionType, setQuestionType] = useState<QuestionType>('Multiple Choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [testTitle, setTestTitle] = useState('');
  const [ocrTitle, setOcrTitle] = useState('');
  const [ocrFiles, setOcrFiles] = useState<PendingFile[]>([]);
  const [ocrDragOver, setOcrDragOver] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [publishModal, setPublishModal] = useState<PublishModalState | null>(null);
  const [publishScheduledAt, setPublishScheduledAt] = useState(() => toDatetimeLocalValue());
  const [publishDuration, setPublishDuration] = useState(60);
  const [publishVisibleOn, setPublishVisibleOn] = useState<VisibilityOption>('Website & Mobile App');
  const [publishApplicants, setPublishApplicants] = useState<Application[]>([]);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{
    publication: TestPublication;
    portalUrl: string;
  } | null>(null);
  const [defaultPassMarks, setDefaultPassMarks] = useState(40);
  const [passMarksInput, setPassMarksInput] = useState('40');
  const [savingPassMarks, setSavingPassMarks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  const refreshTests = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, listRes, settingsRes] = await Promise.all([
        fetchAdmissionTestMeta(),
        fetchAdmissionTests(),
        fetchAdmissionTestSettings(),
      ]);
      setMeta(metaRes);
      setTests(listRes.tests);
      setDefaultPassMarks(settingsRes.settings.passMarksPercent);
      setPassMarksInput(String(settingsRes.settings.passMarksPercent));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTests();
  }, [refreshTests]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const addFiles = (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length === 0) {
      setErrorMsg('Please upload PDF files only');
      return;
    }
    setErrorMsg(null);
    setPendingFiles((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
      })),
    ]);
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const addOcrFiles = (files: FileList | File[]) => {
    const allowed = Array.from(files).filter((f) => {
      const n = f.name.toLowerCase();
      return (
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        n.endsWith('.pdf') ||
        n.endsWith('.jpg') ||
        n.endsWith('.jpeg') ||
        n.endsWith('.png') ||
        n.endsWith('.webp')
      );
    });
    if (allowed.length === 0) {
      setErrorMsg('Please upload JPG, PNG, or PDF scan files');
      return;
    }
    setErrorMsg(null);
    setOcrFiles((prev) => [
      ...prev,
      ...allowed.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
      })),
    ]);
  };

  const removeOcrFile = (id: string) => {
    setOcrFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleGenerate = async () => {
    if (pendingFiles.length === 0) {
      setErrorMsg('Upload at least one PDF chapter');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    try {
      const files = await Promise.all(
        pendingFiles.map(async (p) => ({
          fileName: p.name,
          mimeType: p.file.type || 'application/pdf',
          fileData: await fileToBase64(p.file),
        })),
      );
      const res = await generateQuestionsFromPdf({
        title: testTitle.trim() || undefined,
        files,
        numQuestions,
        questionType,
        difficulty,
      });
      setReview({
        mode: 'create',
        source: 'PDF',
        title: testTitle.trim() || res.suggestedTitle,
        durationMinutes: 60,
        questionType,
        difficulty,
        numQuestions,
        fileMeta: res.fileMeta,
        questions: res.questions,
      });
      setSuccessMsg(`Generated ${res.questions.length} questions — review before saving`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleOcrScan = async () => {
    if (ocrFiles.length === 0) {
      setErrorMsg('Upload a scanned test image or PDF');
      return;
    }
    setOcrScanning(true);
    setErrorMsg(null);
    try {
      const files = await Promise.all(
        ocrFiles.map(async (p) => ({
          fileName: p.name,
          mimeType: p.file.type || 'application/octet-stream',
          fileData: await fileToBase64(p.file),
        })),
      );
      const res = await scanTestWithOcr({
        title: ocrTitle.trim() || undefined,
        files,
        questionType,
        difficulty,
      });
      setReview({
        mode: 'create',
        source: 'OCR',
        title: ocrTitle.trim() || res.suggestedTitle,
        durationMinutes: 60,
        questionType,
        difficulty,
        numQuestions: res.questions.length,
        fileMeta: res.fileMeta,
        questions: res.questions,
        previewFiles: res.previewFiles,
        previewIndex: 0,
        rawOcrText: res.rawOcrText,
      });
      setSuccessMsg(`OCR extracted ${res.questions.length} questions — review and fix any typos`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'OCR scan failed');
    } finally {
      setOcrScanning(false);
    }
  };

  const openEdit = async (testId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetchAdmissionTest(testId);
      const t = res.test;
      setReview({
        mode: 'edit',
        testId: t.id,
        source: (t.source as TestSource) || 'PDF',
        title: t.title,
        durationMinutes: t.durationMinutes,
        questionType: (t.questionType as QuestionType) || 'Multiple Choice',
        difficulty: (t.difficulty as Difficulty) || 'Medium',
        numQuestions: t.numQuestions,
        passMarksPercent: t.passMarksPercent ?? null,
        fileMeta: Array.isArray(t.sourceFilesMeta) ? t.sourceFilesMeta : [],
        questions: (t.questions || []).map((q) => ({
          type: q.type,
          difficulty: q.difficulty,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
        })),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load test');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Delete this draft test?')) return;
    try {
      await deleteAdmissionTest(testId);
      setSuccessMsg('Test deleted');
      await refreshTests();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete test');
    }
  };

  const openPublishModal = async (test: AdmissionTestSummary) => {
    setErrorMsg(null);
    setPublishedResult(null);
    setPublishModal({
      testId: test.id,
      testTitle: test.title,
      defaultDuration: test.durationMinutes || 60,
    });
    setPublishScheduledAt(toDatetimeLocalValue());
    setPublishDuration(test.durationMinutes || 60);
    setPublishVisibleOn('Website & Mobile App');
    setSelectedApplicantIds([]);
    setPublishLoading(true);
    try {
      const res = await fetchApplications();
      const eligible = res.applications.filter(
        (a) => a.status !== 'Approved' && a.status !== 'Rejected',
      );
      setPublishApplicants(eligible);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load applicants');
      setPublishModal(null);
    } finally {
      setPublishLoading(false);
    }
  };

  const openViewCredentials = async (testId: string) => {
    setErrorMsg(null);
    setPublishLoading(true);
    try {
      const res = await fetchTestPublication(testId);
      if (!res.publication) {
        setErrorMsg('No publication found for this test');
        return;
      }
      const test = tests.find((t) => t.id === testId);
      setPublishModal({
        testId,
        testTitle: test?.title || 'Published Test',
        defaultDuration: res.publication.durationMinutes,
      });
      setPublishedResult({
        publication: res.publication,
        portalUrl: `${window.location.origin}/entrance-exam`,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setPublishLoading(false);
    }
  };

  const toggleApplicant = (id: string) => {
    setSelectedApplicantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handlePublish = async () => {
    if (!publishModal) return;
    if (selectedApplicantIds.length === 0) {
      setErrorMsg('Select at least one applicant');
      return;
    }
    setPublishLoading(true);
    setErrorMsg(null);
    try {
      const res = await publishAdmissionTest(publishModal.testId, {
        scheduledAt: new Date(publishScheduledAt).toISOString(),
        durationMinutes: publishDuration,
        visibleOn: publishVisibleOn,
        applicationIds: selectedApplicantIds,
      });
      setPublishedResult({ publication: res.publication, portalUrl: res.portalUrl });
      setSuccessMsg(res.message);
      await refreshTests();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish test');
    } finally {
      setPublishLoading(false);
    }
  };

  const copyCredential = (text: string) => {
    void navigator.clipboard.writeText(text);
    setSuccessMsg('Copied to clipboard');
  };

  const handleSavePassMarks = async () => {
    const value = Number(passMarksInput);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setErrorMsg('Pass marks must be between 0 and 100');
      return;
    }
    setSavingPassMarks(true);
    setErrorMsg(null);
    try {
      const res = await updateAdmissionTestSettings(value);
      setDefaultPassMarks(res.settings.passMarksPercent);
      setPassMarksInput(String(res.settings.passMarksPercent));
      setSuccessMsg('Admission pass marks updated');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save pass marks');
    } finally {
      setSavingPassMarks(false);
    }
  };

  const updateReviewQuestion = (index: number, patch: Partial<TestQuestionInput>) => {
    setReview((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], ...patch };
      return { ...prev, questions };
    });
  };

  const removeReviewQuestion = (index: number) => {
    setReview((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: prev.questions.filter((_, i) => i !== index) };
    });
  };

  const handleSaveDraft = async () => {
    if (!review) return;
    if (!review.title.trim()) {
      setErrorMsg('Test title is required');
      return;
    }
    if (review.questions.length === 0) {
      setErrorMsg('Add at least one question');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      if (review.mode === 'edit' && review.testId) {
        await updateAdmissionTest(review.testId, {
          title: review.title.trim(),
          durationMinutes: review.durationMinutes,
          numQuestions: review.questions.length,
          questionType: review.questionType,
          difficulty: review.difficulty,
          passMarksPercent: review.passMarksPercent ?? null,
          questions: review.questions,
        });
        setSuccessMsg('Test updated');
      } else {
        await createAdmissionTest({
          title: review.title.trim(),
          durationMinutes: review.durationMinutes,
          numQuestions: review.questions.length,
          questionType: review.questionType,
          difficulty: review.difficulty,
          source: review.source,
          passMarksPercent: review.passMarksPercent ?? null,
          sourceFilesMeta: review.fileMeta,
          questions: review.questions,
        });
        setSuccessMsg('Draft test saved');
        if (review.source === 'PDF') {
          setPendingFiles([]);
          setTestTitle('');
        } else {
          setOcrFiles([]);
          setOcrTitle('');
        }
      }
      setReview(null);
      await refreshTests();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admission Test</h1>
          <p className="text-sm text-slate-500 mt-1">Build entrance tests from PDF chapters with AI assistance</p>
        </div>
        <a
          href="/entrance-exam"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <ExternalLink size={16} />
          Open Student Portal
        </a>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Admission Pass Marks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Default minimum score (%) to pass entrance exams. Used for auto-grading and merit list.
                Override per test in the review modal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={passMarksInput}
                onChange={(e) => setPassMarksInput(e.target.value)}
                className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center font-bold"
              />
              <span className="text-sm text-slate-500 font-medium">%</span>
            </div>
            <button
              type="button"
              disabled={savingPassMarks}
              onClick={() => void handleSavePassMarks()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              {savingPassMarks ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Current default: {defaultPassMarks}% · Merit List uses this unless a test has its own pass marks.
        </p>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            errorMsg ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Test list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings size={18} className="text-indigo-600" /> Test Configurations
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading tests...
              </div>
            ) : tests.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No tests yet. Use &ldquo;Create from PDF&rdquo; on the right to generate your first quiz.
              </p>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-indigo-100 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{test.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileQuestion size={12} /> {test.questionCount} Qs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {test.durationMinutes} mins
                        </span>
                        <span>{test.questionType}</span>
                        <span>{test.difficulty}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold">
                        {test.status}
                      </span>
                      {test.source === 'PDF' && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold">
                          PDF + AI
                        </span>
                      )}
                      {test.source === 'OCR' && (
                        <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded font-bold">
                          OCR Scan
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void openEdit(test.id)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      {test.statusKey === 'DRAFT' && test.questionCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void openPublishModal(test)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1"
                        >
                          <Send size={12} /> Publish
                        </button>
                      )}
                      {test.statusKey === 'PUBLISHED' && (
                        <button
                          type="button"
                          onClick={() => void openViewCredentials(test.id)}
                          className="text-teal-600 hover:text-teal-800 text-xs font-semibold flex items-center gap-1"
                        >
                          <Users size={12} /> Credentials
                        </button>
                      )}
                      {test.statusKey === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteTest(test.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete draft"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setRightTab('syllabus')}
                className={`flex-1 px-2 py-2.5 text-[10px] sm:text-xs font-semibold ${
                  rightTab === 'syllabus'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                From Syllabus
              </button>
              <button
                type="button"
                onClick={() => setRightTab('pdf')}
                className={`flex-1 px-2 py-2.5 text-[10px] sm:text-xs font-semibold ${
                  rightTab === 'pdf'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Create from PDF
              </button>
              <button
                type="button"
                onClick={() => setRightTab('ocr')}
                className={`flex-1 px-2 py-2.5 text-[10px] sm:text-xs font-semibold ${
                  rightTab === 'ocr'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Scan Test (OCR)
              </button>
            </div>

            <div className="p-5">
              {rightTab === 'syllabus' && (
                <div className="text-center py-8">
                  <Sparkles size={32} className="mx-auto text-indigo-300 mb-3" />
                  <p className="text-sm font-medium text-slate-700">Syllabus-based generation</p>
                  <p className="text-xs text-slate-500 mt-1">Coming in a later phase. Use Create from PDF for now.</p>
                </div>
              )}

              {rightTab === 'pdf' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title (optional)</label>
                    <input
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="e.g. Class 11 Science Entrance"
                    />
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <UploadCloud size={28} className="mx-auto text-indigo-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Drop PDF chapters here</p>
                    <p className="text-xs text-slate-500 mt-1">Chapter 1, 2, 3… multiple files supported</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Browse files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {pendingFiles.length > 0 && (
                    <div className="space-y-1">
                      {pendingFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-slate-700 truncate">
                            <FileText size={12} className="text-red-500 shrink-0" />
                            {f.name}
                          </span>
                          <button type="button" onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Questions</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value) || 1)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Question Type</label>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        {meta.questionTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        {meta.difficulties.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={generating || pendingFiles.length === 0}
                    onClick={() => void handleGenerate()}
                    className="w-full bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Generate Questions
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Requires GEMINI_API_KEY on the backend server
                  </p>
                </div>
              )}

              {rightTab === 'ocr' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title (optional)</label>
                    <input
                      value={ocrTitle}
                      onChange={(e) => setOcrTitle(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="e.g. Class 10 Mid-term Scan"
                    />
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOcrDragOver(true);
                    }}
                    onDragLeave={() => setOcrDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOcrDragOver(false);
                      if (e.dataTransfer.files.length) addOcrFiles(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      ocrDragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <ScanLine size={28} className="mx-auto text-teal-500 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Drop scanned test here</p>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG, or scanned PDF of an old paper test</p>
                    <button
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-800"
                    >
                      Browse files
                    </button>
                    <input
                      ref={ocrFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) addOcrFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {ocrFiles.length > 0 && (
                    <div className="space-y-1">
                      {ocrFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-slate-700 truncate">
                            <FileText size={12} className="text-teal-500 shrink-0" />
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOcrFile(f.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Question Type</label>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        {meta.questionTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        {meta.difficulties.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={ocrScanning || ocrFiles.length === 0}
                    onClick={() => void handleOcrScan()}
                    className="w-full bg-teal-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {ocrScanning ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Scanning…
                      </>
                    ) : (
                      <>
                        <ScanLine size={16} /> Scan &amp; Convert
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Uses Gemini vision OCR — fix typos in the split-screen cleanup step
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review / OCR cleanup modal */}
      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40">
          <div
            className={`bg-white rounded-xl shadow-xl w-full flex flex-col ${
              review.source === 'OCR' && review.previewFiles?.length
                ? 'max-w-6xl max-h-[95vh]'
                : 'max-w-3xl max-h-[90vh]'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {review.source === 'OCR' ? 'OCR Cleanup — Review & Edit' : 'Review Generated Questions'}
                </h2>
                <p className="text-xs text-slate-500">
                  {review.source === 'OCR'
                    ? 'Original scan on the left — fix digitized text on the right before saving'
                    : 'Edit, fix typos, or remove questions before saving as draft'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={`flex-1 min-h-0 overflow-hidden ${
                review.source === 'OCR' && review.previewFiles?.length
                  ? 'grid grid-cols-1 lg:grid-cols-2'
                  : ''
              }`}
            >
              {review.source === 'OCR' && review.previewFiles && review.previewFiles.length > 0 && (
                <div className="border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50 flex flex-col min-h-[240px] lg:min-h-0">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Original Scan</span>
                    {review.previewFiles.length > 1 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={(review.previewIndex ?? 0) <= 0}
                          onClick={() =>
                            setReview((r) =>
                              r ? { ...r, previewIndex: Math.max(0, (r.previewIndex ?? 0) - 1) } : r,
                            )
                          }
                          className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span className="text-[10px] text-slate-500 self-center">
                          {(review.previewIndex ?? 0) + 1} / {review.previewFiles.length}
                        </span>
                        <button
                          type="button"
                          disabled={(review.previewIndex ?? 0) >= review.previewFiles.length - 1}
                          onClick={() =>
                            setReview((r) =>
                              r
                                ? {
                                    ...r,
                                    previewIndex: Math.min(
                                      review.previewFiles!.length - 1,
                                      (r.previewIndex ?? 0) + 1,
                                    ),
                                  }
                                : r,
                            )
                          }
                          className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    {(() => {
                      const pf = review.previewFiles![review.previewIndex ?? 0];
                      if (pf.mimeType.includes('pdf')) {
                        return (
                          <iframe
                            title={pf.fileName}
                            src={pf.dataUrl}
                            className="w-full h-[min(70vh,520px)] rounded border border-slate-200 bg-white"
                          />
                        );
                      }
                      return (
                        <img
                          src={pf.dataUrl}
                          alt={pf.fileName}
                          className="max-w-full h-auto mx-auto rounded border border-slate-200 shadow-sm"
                        />
                      );
                    })()}
                    <p className="text-[10px] text-slate-400 mt-2 text-center truncate">{review.previewFiles[review.previewIndex ?? 0]?.fileName}</p>
                  </div>
                </div>
              )}

              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title *</label>
                    <input
                      value={review.title}
                      onChange={(e) => setReview({ ...review, title: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={review.durationMinutes}
                      onChange={(e) =>
                        setReview({ ...review, durationMinutes: Number(e.target.value) || 60 })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pass Marks (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder={`Default ${defaultPassMarks}%`}
                      value={review.passMarksPercent ?? ''}
                      onChange={(e) =>
                        setReview({
                          ...review,
                          passMarksPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Leave blank to use institution default</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  {review.questions.length} question{review.questions.length !== 1 ? 's' : ''} •{' '}
                  {review.questionType} • {review.difficulty}
                </p>

                {review.rawOcrText && (
                  <details className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50">
                    <summary className="font-semibold text-slate-600 cursor-pointer">Raw OCR transcription</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-slate-500 max-h-32 overflow-y-auto text-[10px]">
                      {review.rawOcrText}
                    </pre>
                  </details>
                )}

                {review.questions.map((q, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-indigo-600">Q{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeReviewQuestion(i)}
                        className="text-red-400 hover:text-red-600"
                        title="Remove question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      value={q.questionText}
                      onChange={(e) => updateReviewQuestion(i, { questionText: e.target.value })}
                      rows={2}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                    {(q.type === 'Multiple Choice' || (q.options && q.options.length > 0)) && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Options (one per line)</label>
                        <textarea
                          value={(q.options || []).join('\n')}
                          onChange={(e) =>
                            updateReviewQuestion(i, {
                              options: e.target.value.split('\n').filter(Boolean),
                            })
                          }
                          rows={4}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Correct Answer</label>
                      <input
                        value={q.correctAnswer || ''}
                        onChange={(e) => updateReviewQuestion(i, { correctAnswer: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm mt-0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReview(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveDraft()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish to Entrance Exam Portal */}
      {publishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {publishedResult ? 'Exam Credentials' : 'Publish to Entrance Exam Portal'}
                </h2>
                <p className="text-xs text-slate-500">{publishModal.testTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPublishModal(null);
                  setPublishedResult(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {publishedResult ? (
                <>
                  <div className="flex items-center justify-between gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">Student Portal URL</p>
                      <p className="text-sm font-mono text-indigo-900 break-all">{publishedResult.portalUrl}</p>
                    </div>
                    <a
                      href={publishedResult.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                      title="Open portal"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <p className="text-xs text-slate-500">
                    Share each student&apos;s token and PIN. Scheduled:{' '}
                    {new Date(publishedResult.publication.scheduledAt).toLocaleString()} ·{' '}
                    {publishedResult.publication.durationMinutes} min · {publishedResult.publication.visibleOn}
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left p-2 font-semibold">Student</th>
                          <th className="text-left p-2 font-semibold">Token</th>
                          <th className="text-left p-2 font-semibold">PIN</th>
                          <th className="text-left p-2 font-semibold">Status</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {publishedResult.publication.credentials.map((c) => (
                          <tr key={c.id} className="border-t border-slate-100">
                            <td className="p-2">
                              <p className="font-medium text-slate-800">{c.studentName}</p>
                              <p className="text-[10px] text-slate-400">{c.email || c.mobile}</p>
                            </td>
                            <td className="p-2 font-mono">{c.tokenNumber}</td>
                            <td className="p-2 font-mono">{c.pin}</td>
                            <td className="p-2">
                              {c.submitted ? (
                                <span
                                  className={`font-semibold ${
                                    c.passed ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {c.passed ? 'Passed' : 'Failed'}
                                  {c.score != null ? ` (${c.score}%)` : ''}
                                </span>
                              ) : (
                                <span className="text-amber-600">Pending</span>
                              )}
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  copyCredential(
                                    `Token: ${c.tokenNumber}\nPIN: ${c.pin}\nPortal: ${publishedResult.portalUrl}`,
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-indigo-600"
                                title="Copy credentials"
                              >
                                <Copy size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : publishLoading && publishApplicants.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">Destination</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">Entrance Exam Portal</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Test Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={publishScheduledAt}
                        onChange={(e) => setPublishScheduledAt(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Time Limit (minutes)</label>
                      <input
                        type="number"
                        min={5}
                        max={480}
                        value={publishDuration}
                        onChange={(e) => setPublishDuration(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Visibility</label>
                    <select
                      value={publishVisibleOn}
                      onChange={(e) => setPublishVisibleOn(e.target.value as VisibilityOption)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="Website">Website</option>
                      <option value="Mobile App">Mobile App</option>
                      <option value="Website & Mobile App">Website &amp; Mobile App</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600">Assign Applicants</label>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedApplicantIds(
                            selectedApplicantIds.length === publishApplicants.length
                              ? []
                              : publishApplicants.map((a) => a.id),
                          )
                        }
                        className="text-[10px] text-indigo-600 font-semibold"
                      >
                        {selectedApplicantIds.length === publishApplicants.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {publishApplicants.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                        No eligible applicants. Create applications first in the Applications module.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {publishApplicants.map((app) => (
                          <label
                            key={app.id}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedApplicantIds.includes(app.id)}
                              onChange={() => toggleApplicant(app.id)}
                              className="accent-indigo-600"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">{app.studentName}</p>
                              <p className="text-[10px] text-slate-400">
                                {app.applicationId} · {app.classApplied} · {app.status}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPublishModal(null);
                  setPublishedResult(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {publishedResult ? 'Close' : 'Cancel'}
              </button>
              {!publishedResult && (
                <button
                  type="button"
                  disabled={publishLoading || publishApplicants.length === 0 || selectedApplicantIds.length === 0}
                  onClick={() => void handlePublish()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {publishLoading && <Loader2 size={14} className="animate-spin" />}
                  <Send size={14} /> Publish Test
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
