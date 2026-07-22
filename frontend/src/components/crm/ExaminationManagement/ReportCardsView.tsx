import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileText, Image, Loader2, Lock,
  Printer, RefreshCw, Share2, Upload, XCircle,
} from 'lucide-react';
import {
  ClassReportCardStatus,
  fetchBoardMarksheetUploads,
  fetchClassReportCardStatuses,
  fetchReportCardConfig,
  fetchReportCardPreview,
  fetchReportCardsMeta,
  fetchResultBatch,
  generateAllReportCards,
  generateReportCards,
  seedReportCards,
  shareReportCards,
  updateReportCardConfig,
  uploadBoardMarksheet,
  uploadReportCardAsset,
  type ReportCardConfig,
} from '../../../lib/examinationServices';
import { downloadReportCardPdf, TEMPLATE_PREVIEW_COLORS } from '../../../lib/reportCardPdf';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'status' | 'templates' | 'generate' | 'board';

const STATUS_COLORS: Record<string, string> = {
  COMPLETE: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  MARKS_PENDING: 'bg-red-100 text-red-800',
  GENERATED: 'bg-blue-100 text-blue-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  SHARED: 'bg-indigo-100 text-indigo-800',
};

const TEMPLATE_LABELS: Record<string, string> = {
  PRE_PRIMARY: 'Pre-Primary',
  PRIMARY: 'Primary (1–4)',
  MIDDLE: 'Middle (6–7)',
  UPPER: 'Upper (9 & 11)',
  BOARD: 'Board Exam',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ReportCardsView() {
  const [tab, setTab] = useState<Tab>('status');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchReportCardsMeta>> | null>(null);
  const [classes, setClasses] = useState<ClassReportCardStatus[]>([]);
  const [summary, setSummary] = useState({ totalClasses: 0, marksPending: 0, generated: 0, published: 0, boardExam: 0, pending: 0 });
  const [config, setConfig] = useState<ReportCardConfig | null>(null);
  const [boardUploads, setBoardUploads] = useState<Awaited<ReturnType<typeof fetchBoardMarksheetUploads>>['uploads']>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detailClass, setDetailClass] = useState<ClassReportCardStatus | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [configForm, setConfigForm] = useState({ schoolName: '', schoolAddress: '', principalName: '', footerNote: '', boardExamNotice: '' });
  const [boardUploadModal, setBoardUploadModal] = useState<{ studentId: string; studentName: string; className: string; sectionName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadAssetType, setUploadAssetType] = useState<'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo' | null>(null);

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchReportCardsMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let statusData = await fetchClassReportCardStatuses(yearFilter);
      if (!statusData.classes.some((c) => c.generatedCount > 0)) {
        await seedReportCards(yearFilter);
        statusData = await fetchClassReportCardStatuses(yearFilter);
      }
      const [configData, boardData] = await Promise.all([
        fetchReportCardConfig(yearFilter),
        fetchBoardMarksheetUploads({ academicYear: yearFilter }),
      ]);
      setClasses(statusData.classes);
      setSummary(statusData.summary);
      setConfig(configData.config);
      setConfigForm({
        schoolName: configData.config.schoolName,
        schoolAddress: configData.config.schoolAddress,
        principalName: configData.config.principalName,
        footerNote: configData.config.footerNote,
        boardExamNotice: configData.config.boardExamNotice,
      });
      setBoardUploads(boardData.uploads);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleGenerate = async (cls: ClassReportCardStatus) => {
    if (!cls.batchId) return;
    setActionLoading(true);
    try {
      const result = await generateReportCards(cls.batchId);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setActionLoading(true);
    try {
      const result = await generateAllReportCards(academicYear);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreview = async (cls: ClassReportCardStatus) => {
    if (!cls.batchId) return;
    setPreviewLoading(true);
    try {
      const batch = await fetchResultBatch(cls.batchId);
      const firstResult = batch.results[0];
      if (!firstResult) {
        setErrorMsg('No student results found for preview');
        return;
      }
      const preview = await fetchReportCardPreview(firstResult.id);
      downloadReportCardPdf(preview);
      setSuccessMsg(`Preview downloaded for ${preview.result.studentName}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading(true);
    try {
      const result = await updateReportCardConfig({ academicYear, ...configForm });
      setConfig(result.config);
      setSuccessMsg(result.message);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssetUpload = async (file: File) => {
    if (!uploadAssetType) return;
    setActionLoading(true);
    try {
      const fileData = await fileToBase64(file);
      const result = await uploadReportCardAsset(uploadAssetType, file.name, fileData, academicYear);
      setConfig(result.config);
      setSuccessMsg(result.message);
      setUploadAssetType(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBoardUpload = async (file: File) => {
    if (!boardUploadModal) return;
    setActionLoading(true);
    try {
      const fileData = await fileToBase64(file);
      const result = await uploadBoardMarksheet({
        studentId: boardUploadModal.studentId,
        academicYear,
        className: boardUploadModal.className,
        sectionName: boardUploadModal.sectionName,
        fileName: file.name,
        mimeType: file.type,
        fileData,
      });
      setSuccessMsg(result.message);
      setBoardUploadModal(null);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async (cls: ClassReportCardStatus) => {
    if (!cls.batchId) return;
    setActionLoading(true);
    try {
      const result = await shareReportCards(cls.batchId);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: 'Class Status' },
    { id: 'templates', label: 'Templates & Assets' },
    { id: 'generate', label: 'Generate & Preview' },
    { id: 'board', label: 'Board Exam' },
  ];

  const boardClasses = classes.filter((c) => c.isBoardExam);

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Report Cards"
        title="Report Cards"
        subtitle="Class-wise report card status, four default designs, signature/seal uploads, and board exam marksheets"
        actions={(
          <div className="flex items-center gap-2">
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); void load(e.target.value); }}
              className={am.select}
            >
              {(meta?.academicYears || [academicYear]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <XCircle size={16} /> {errorMsg}
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} /> {successMsg}
          <button type="button" onClick={() => setSuccessMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Classes', value: summary.totalClasses, color: 'text-slate-700' },
          { label: 'Marks Pending', value: summary.marksPending, color: 'text-amber-600' },
          { label: 'Generated', value: summary.generated, color: 'text-blue-600' },
          { label: 'Published', value: summary.published, color: 'text-green-600' },
          { label: 'Board Exam', value: summary.boardExam, color: 'text-orange-600' },
          { label: 'Pending', value: summary.pending, color: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <AcademicLoading /> : (
        <>
          {tab === 'status' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Report Card Status — All Classes</h3>
                <p className="text-[10px] text-slate-500">Marks entry auto-marked PENDING if any subject is incomplete</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                      <th className={am.th}>Class</th>
                      <th className={am.th}>Template</th>
                      <th className={am.th}>Marks Entry</th>
                      <th className={am.th}>Pending Subjects</th>
                      <th className={am.th}>Report Card</th>
                      <th className={am.th}>Students</th>
                      <th className={am.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={`${cls.className}-${cls.sectionName}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={am.td}>
                          <span className="font-medium">{cls.classGroup}</span>
                          {cls.isBoardExam && (
                            <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-700">Board</span>
                          )}
                        </td>
                        <td className={am.td}>{cls.templateLabel}</td>
                        <td className={am.td}>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[cls.marksEntryStatus]}`}>
                            {cls.marksEntryStatus}
                          </span>
                        </td>
                        <td className={am.td}>
                          {cls.pendingSubjectCount > 0 ? (
                            <span className="text-red-600">{cls.pendingSubjectCount} / {cls.totalSubjects}</span>
                          ) : (
                            <span className="text-emerald-600">All complete</span>
                          )}
                        </td>
                        <td className={am.td}>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[cls.reportCardStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {cls.reportCardStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={am.td}>{cls.generatedCount}/{cls.totalStudents}</td>
                        <td className={am.td}>
                          <button type="button" onClick={() => setDetailClass(cls)} className="text-blue-600 hover:underline">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summary.marksPending > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <strong>Publication blocked:</strong> {summary.marksPending} class(es) have pending marks entry.
                    Results cannot be published (manual or scheduled) until all subject marksheets are approved and all student marks are captured.
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'templates' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Four Default Report Card Designs</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(TEMPLATE_LABELS) as [string, string][]).map(([id, label]) => {
                    const colors = TEMPLATE_PREVIEW_COLORS[id as keyof typeof TEMPLATE_PREVIEW_COLORS];
                    return (
                      <div
                        key={id}
                        className="rounded-lg border p-3"
                        style={{ borderColor: `rgb(${colors.primary.join(',')})`, backgroundColor: `rgb(${colors.bg.join(',')})` }}
                      >
                        <p className="text-xs font-bold" style={{ color: `rgb(${colors.primary.join(',')})` }}>{label}</p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          {id === 'PRE_PRIMARY' && 'Nursery, LKG, UKG — colourful grade cards'}
                          {id === 'PRIMARY' && 'Class 1–4 — subject marks table'}
                          {id === 'MIDDLE' && 'Class 6–7 — GPA, rank, performance'}
                          {id === 'UPPER' && 'Class 9 & 11 — CGPA, aggregate summary'}
                          {id === 'BOARD' && 'Class 5, 8, 10, 12 — Govt. board marksheet'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">School Details & Assets</h3>
                <div className="space-y-3">
                  {(['schoolName', 'schoolAddress', 'principalName'] as const).map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-[10px] font-medium text-slate-600 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        type="text"
                        value={configForm[field]}
                        onChange={(e) => setConfigForm((f) => ({ ...f, [field]: e.target.value }))}
                        className={am.input}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">Footer Note</label>
                    <input type="text" value={configForm.footerNote} onChange={(e) => setConfigForm((f) => ({ ...f, footerNote: e.target.value }))} className={am.input} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-600">Board Exam Notice</label>
                    <textarea value={configForm.boardExamNotice} onChange={(e) => setConfigForm((f) => ({ ...f, boardExamNotice: e.target.value }))} className={`${am.input} min-h-[60px]`} />
                  </div>
                  <button type="button" onClick={() => void handleSaveConfig()} disabled={actionLoading} className={am.btnPrimary}>
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null} Save Configuration
                  </button>
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-2`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Upload Signatures & Seal</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    { type: 'headerLogo' as const, label: 'School Logo', icon: Image, uploaded: config?.hasHeaderLogo },
                    { type: 'principalSignature' as const, label: 'Principal Signature', icon: FileText, uploaded: config?.hasPrincipalSignature },
                    { type: 'classTeacherSignature' as const, label: 'Class Teacher Signature', icon: FileText, uploaded: config?.hasClassTeacherSignature },
                    { type: 'schoolSeal' as const, label: 'School Seal', icon: Image, uploaded: config?.hasSchoolSeal },
                  ]).map((asset) => (
                    <button
                      key={asset.type}
                      type="button"
                      onClick={() => { setUploadAssetType(asset.type); fileInputRef.current?.click(); }}
                      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 hover:border-blue-400 hover:bg-blue-50"
                    >
                      <asset.icon size={20} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-700">{asset.label}</span>
                      {asset.uploaded ? (
                        <span className="flex items-center gap-1 text-[9px] text-emerald-600"><CheckCircle2 size={10} /> Uploaded</span>
                      ) : (
                        <span className="text-[9px] text-slate-400">Click to upload</span>
                      )}
                    </button>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAssetUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          )}

          {tab === 'generate' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Generate Report Cards</h3>
                  <p className="text-[10px] text-slate-500">Generate only when marks entry is complete. Publication requires generated report cards.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateAll()}
                  disabled={actionLoading}
                  className={am.btnPrimary}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                  Generate All Ready Classes
                </button>
              </div>
              <div className="space-y-2">
                {classes.filter((c) => !c.isBoardExam).map((cls) => (
                  <div key={`${cls.className}-${cls.sectionName}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-slate-800">{cls.classGroup}</p>
                      <p className="text-[10px] text-slate-500">{cls.templateLabel} · {cls.generatedCount}/{cls.totalStudents} generated</p>
                      {cls.blockers.length > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                          <AlertTriangle size={10} /> {cls.blockers[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {cls.canGenerate && (
                        <button type="button" onClick={() => void handleGenerate(cls)} disabled={actionLoading} className={am.btnPrimary}>
                          <Printer size={12} /> Generate
                        </button>
                      )}
                      {cls.generatedCount > 0 && (
                        <button type="button" onClick={() => void handlePreview(cls)} disabled={previewLoading} className={am.btnSecondary}>
                          <Download size={12} /> Preview PDF
                        </button>
                      )}
                      {cls.reportCardStatus === 'PUBLISHED' && (
                        <button type="button" onClick={() => void handleShare(cls)} disabled={actionLoading} className={am.btnSecondary}>
                          <Share2 size={12} /> Mark Shared
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'board' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Board Examination Marksheet Upload</h3>
              <p className="mb-4 text-xs text-slate-500">
                Class 5, 8, 10, and 12 marksheets are issued by the government board. Upload official board marksheets here.
              </p>
              {boardClasses.length === 0 ? (
                <p className="text-xs text-slate-400">No board exam classes configured.</p>
              ) : (
                <div className="space-y-3">
                  {boardClasses.map((cls) => (
                    <div key={`${cls.className}-${cls.sectionName}`} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-orange-900">{cls.classGroup}</p>
                          <p className="text-[10px] text-orange-700">Government-issued marksheet required</p>
                        </div>
                        <span className="rounded bg-orange-200 px-2 py-0.5 text-[10px] text-orange-800">Board Exam</span>
                      </div>
                      <div className="mt-3">
                        <p className="mb-2 text-[10px] font-medium text-slate-600">Uploaded Marksheets ({boardUploads.filter((u) => u.className === cls.className && u.sectionName === cls.sectionName).length})</p>
                        {boardUploads.filter((u) => u.className === cls.className && u.sectionName === cls.sectionName).map((u) => (
                          <div key={u.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-[10px]">
                            <span>{u.studentName} ({u.admissionNumber}) — {u.fileName}</span>
                            <span className="text-slate-400">{new Date(u.uploadedAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                <Upload size={24} className="mx-auto text-slate-400" />
                <p className="mt-2 text-xs text-slate-600">Upload board marksheet PDF/image for a student</p>
                <p className="text-[10px] text-slate-400">Use student ID from student records</p>
              </div>
            </div>
          )}
        </>
      )}

      <AcademicModal open={Boolean(detailClass)} onClose={() => setDetailClass(null)} title={detailClass?.classGroup || 'Class Details'}>
        {detailClass && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-500">Template:</span> {detailClass.templateLabel}</div>
              <div><span className="text-slate-500">Examination:</span> {detailClass.examinationName}</div>
              <div><span className="text-slate-500">Marks Entry:</span> {detailClass.marksEntryStatus}</div>
              <div><span className="text-slate-500">Report Card:</span> {detailClass.reportCardStatus}</div>
              <div><span className="text-slate-500">Generated:</span> {detailClass.generatedCount}/{detailClass.totalStudents}</div>
              <div><span className="text-slate-500">Published:</span> {detailClass.publishedCount}</div>
            </div>
            {detailClass.blockers.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-1 font-medium text-red-800">Blockers (publication not allowed):</p>
                <ul className="list-inside list-disc text-red-700">
                  {detailClass.blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}
            {detailClass.canGenerate && (
              <button type="button" onClick={() => { void handleGenerate(detailClass); setDetailClass(null); }} className={am.btnPrimary}>
                Generate Report Cards
              </button>
            )}
          </div>
        )}
      </AcademicModal>

      <input
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        id="board-upload-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && boardUploadModal) void handleBoardUpload(file);
          e.target.value = '';
        }}
      />
    </AcademicPageShell>
  );
}
