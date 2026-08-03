import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Copy, ExternalLink, FileText, Filter, Link2, Loader2,
  RefreshCw, Send, Smartphone, Undo2, Users,
} from 'lucide-react';
import {
  fetchPaperLinkCredentials,
  fetchPaperManagementMeta,
  fetchPaperManagementPapers,
  fetchPaperPrintPayload,
  publishPaperAsLink,
  publishPaperToMobile,
  unpublishPaperFromMobile,
  unpublishPaperLink,
  type PaperLinkCredential,
  type PaperManagementRecord,
} from '../../../lib/examinationServices';
import { downloadQuestionPaperPdf } from '../../../lib/questionPaperPdf';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const PURPOSE_COLORS: Partial<Record<string, string>> = {
  CLASS_TEST: 'bg-emerald-100 text-emerald-800',
  UNIT_TEST: 'bg-blue-100 text-blue-800',
  MID_TERM: 'bg-amber-100 text-amber-800',
  ANNUAL_EXAM: 'bg-purple-100 text-purple-800',
  ENTRANCE_TEST: 'bg-red-100 text-red-800',
  PRACTICE: 'bg-slate-100 text-slate-700',
};

type PublishChannel = 'menu' | 'pdf' | 'link' | 'mobile';

export function PaperManagementView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchPaperManagementMeta>> | null>(null);
  const [papers, setPapers] = useState<PaperManagementRecord[]>([]);
  const [summary, setSummary] = useState({
    totalPapers: 0,
    mobilePublished: 0,
    mobilePending: 0,
    linkPublished: 0,
    digitalExams: 0,
    totalQuestions: 0,
  });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [purpose, setPurpose] = useState('all');
  const [publishFilter, setPublishFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [publishPaper, setPublishPaper] = useState<PaperManagementRecord | null>(null);
  const [channel, setChannel] = useState<PublishChannel>('menu');
  const [linkCredentials, setLinkCredentials] = useState<PaperLinkCredential[]>([]);
  const [examLink, setExamLink] = useState<string | null>(null);
  const [mobileResult, setMobileResult] = useState<Awaited<ReturnType<typeof publishPaperToMobile>> | null>(null);

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
        m = await fetchPaperManagementMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = meta ? academicYear : m.defaultAcademicYear;
      const data = await fetchPaperManagementPapers({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
        subjectName: subjectName || undefined,
        purpose: purpose !== 'all' ? purpose : undefined,
        mobileStatus:
          publishFilter === 'mobile'
            ? 'published'
            : publishFilter === 'pending'
              ? 'pending'
              : undefined,
      });
      let list = data.papers;
      if (publishFilter === 'link') list = list.filter((p) => p.isLinkPublished);
      setPapers(list);
      setSummary({
        ...data.summary,
        linkPublished: data.summary.linkPublished ?? data.papers.filter((p) => p.isLinkPublished).length,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName, subjectName, purpose, publishFilter]);

  useEffect(() => { void load(); }, [load]);

  const openPublish = (paper: PaperManagementRecord) => {
    setPublishPaper(paper);
    setChannel('menu');
    setLinkCredentials([]);
    setExamLink(paper.examLink);
    setMobileResult(null);
    setErrorMsg(null);
  };

  const closePublish = () => {
    setPublishPaper(null);
    setChannel('menu');
    setLinkCredentials([]);
    setExamLink(null);
    setMobileResult(null);
  };

  const handlePdf = async () => {
    if (!publishPaper) return;
    setBusyId(publishPaper.id);
    setErrorMsg(null);
    try {
      const payload = await fetchPaperPrintPayload(publishPaper.id);
      downloadQuestionPaperPdf(payload.paper, payload.paper.title);
      setSuccessMsg(`PDF ready for "${payload.paper.title}" — use for manual / printed exam.`);
      closePublish();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishLink = async () => {
    if (!publishPaper) return;
    setBusyId(publishPaper.id);
    setErrorMsg(null);
    try {
      const result = await publishPaperAsLink(publishPaper.id);
      setPublishPaper(result.paper);
      setExamLink(result.examLink);
      setLinkCredentials(result.credentials);
      setChannel('link');
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Link publish failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleViewCredentials = async (paper: PaperManagementRecord) => {
    setBusyId(paper.id);
    setErrorMsg(null);
    try {
      const data = await fetchPaperLinkCredentials(paper.id);
      setPublishPaper(paper);
      setExamLink(data.examLink);
      setLinkCredentials(data.credentials);
      setChannel('link');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load credentials');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublishLink = async (paper: PaperManagementRecord) => {
    setBusyId(paper.id);
    try {
      const result = await unpublishPaperLink(paper.id);
      setSuccessMsg(result.message);
      closePublish();
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unpublish link failed');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishMobile = async () => {
    if (!publishPaper) return;
    setBusyId(publishPaper.id);
    setErrorMsg(null);
    try {
      const result = await publishPaperToMobile(publishPaper.id, 'APP');
      setPublishPaper(result.paper);
      setMobileResult(result);
      setChannel('mobile');
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Mobile publish failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublishMobile = async (paper: PaperManagementRecord) => {
    setBusyId(paper.id);
    try {
      const result = await unpublishPaperFromMobile(paper.id);
      setSuccessMsg(result.message);
      closePublish();
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unpublish failed');
    } finally {
      setBusyId(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMsg('Copied to clipboard');
    } catch {
      setErrorMsg('Could not copy');
    }
  };

  const exportCredentialsCsv = () => {
    if (!linkCredentials.length || !publishPaper) return;
    const header = 'Student Name,Admission No,Roll No,User ID,Password\n';
    const rows = linkCredentials
      .map((c) =>
        [c.studentName, c.admissionNumber || '', c.rollNumber || '', c.userId, c.password]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(publishPaper.title || 'credentials').replace(/[^\w\-]+/g, '_')}_credentials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !papers.length) return <AcademicLoading label="Loading question papers…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Paper Management"
        title="Paper Management"
        subtitle="Class-wise papers from Question Bank — publish as PDF, secure exam link, or Student Mobile App"
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
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className={am.select}>
            <option value="">All Subjects</option>
            {(meta?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={am.select}>
            <option value="all">All Types</option>
            {(meta?.purposes || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={publishFilter} onChange={(e) => setPublishFilter(e.target.value)} className={am.select}>
            <option value="all">All Publish Status</option>
            <option value="link">Link Published</option>
            <option value="mobile">On Mobile App</option>
            <option value="pending">Not on Mobile</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-slate-500 uppercase">Total Papers</p><p className="text-2xl font-bold">{summary.totalPapers}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-sky-600 uppercase">Exam Links</p><p className="text-2xl font-bold">{summary.linkPublished}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-green-600 uppercase">On Mobile</p><p className="text-2xl font-bold">{summary.mobilePublished}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-amber-600 uppercase">Pending Mobile</p><p className="text-2xl font-bold">{summary.mobilePending}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-blue-600 uppercase">Questions</p><p className="text-2xl font-bold">{summary.totalQuestions}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-purple-600 uppercase">Digital</p><p className="text-2xl font-bold">{summary.digitalExams}</p></div>
        </div>

        <div className={am.tableWrap}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={am.th}>Paper Title</th>
                <th className={am.th}>Class</th>
                <th className={am.th}>Subject</th>
                <th className={am.th}>Type</th>
                <th className={am.th}>Questions</th>
                <th className={am.th}>Publish Status</th>
                <th className={am.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {papers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No question papers found. Create papers in Question Bank first.
                  </td>
                </tr>
              ) : papers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className={am.td}>
                    <p className="font-semibold text-slate-900 text-sm">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.recordId} · {p.durationMinutes} min · Pass {p.passMarksPercent}%</p>
                  </td>
                  <td className={am.td}>{p.classGroup}</td>
                  <td className={`${am.td} font-medium`}>{p.subjectName}</td>
                  <td className={am.td}>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PURPOSE_COLORS[p.purpose] || ''}`}>{p.purposeLabel}</span>
                  </td>
                  <td className={am.td}>{p.questionCount}</td>
                  <td className={am.td}>
                    <div className="flex flex-col gap-1">
                      {p.isLinkPublished && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full w-fit">
                          <Link2 size={10} /> Link live · {p.credentialCount || 0} logins
                        </span>
                      )}
                      {p.isMobilePublished && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                          <Smartphone size={10} /> Mobile app
                        </span>
                      )}
                      {!p.isLinkPublished && !p.isMobilePublished && (
                        <span className="text-[10px] text-slate-500">Not published</span>
                      )}
                    </div>
                  </td>
                  <td className={am.td}>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busyId === p.id || p.questionCount === 0}
                        onClick={() => openPublish(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send size={10} /> Publish
                      </button>
                      {p.isLinkPublished && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void handleViewCredentials(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-sky-200 text-sky-700 hover:bg-sky-50"
                        >
                          <Users size={10} /> Credentials
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${am.card} ${am.cardPad}`}>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Publish channels</h3>
          <ul className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <li><strong>PDF</strong> — printable paper for manual / hall exams (no answers).</li>
            <li><strong>Link</strong> — unique User ID &amp; Password per class student; digital test on screen; results sync to Marks Entry.</li>
            <li><strong>Student Mobile App</strong> — appears under Tests; uses existing app login (no extra exam password).</li>
          </ul>
        </div>
      </div>

      <AcademicModal open={!!publishPaper} onClose={closePublish} title="Publish Paper" large>
        {publishPaper && channel === 'menu' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-bold text-slate-900">{publishPaper.title}</p>
              <p className="text-xs text-slate-500 mt-1">{publishPaper.classGroup} · {publishPaper.subjectName}</p>
              <p className="text-xs text-slate-500">{publishPaper.questionCount} questions · {publishPaper.durationMinutes} min</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={busyId === publishPaper.id}
                onClick={() => void handlePdf()}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <FileText size={18} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">PDF file</span>
                <span className="text-[10px] text-slate-500">Print for manual exam</span>
              </button>
              <button
                type="button"
                disabled={busyId === publishPaper.id}
                onClick={() => {
                  if (publishPaper.isLinkPublished) void handleViewCredentials(publishPaper);
                  else void handlePublishLink();
                }}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-3 text-left hover:border-sky-300 hover:bg-sky-50/40"
              >
                <Link2 size={18} className="text-sky-600" />
                <span className="text-xs font-bold text-slate-900">
                  {publishPaper.isLinkPublished ? 'View Link' : 'Link'}
                </span>
                <span className="text-[10px] text-slate-500">User ID + password per student</span>
              </button>
              <button
                type="button"
                disabled={busyId === publishPaper.id}
                onClick={() => {
                  if (publishPaper.isMobilePublished) {
                    setChannel('mobile');
                    setMobileResult(null);
                  } else {
                    void handlePublishMobile();
                  }
                }}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-3 text-left hover:border-green-300 hover:bg-green-50/40"
              >
                <Smartphone size={18} className="text-green-600" />
                <span className="text-xs font-bold text-slate-900">
                  {publishPaper.isMobilePublished ? 'Mobile App' : 'Student Mobile App'}
                </span>
                <span className="text-[10px] text-slate-500">No extra exam login</span>
              </button>
            </div>

            {busyId === publishPaper.id && (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Working…
              </p>
            )}
          </div>
        )}

        {publishPaper && channel === 'link' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
              <p className="text-[10px] font-bold uppercase text-sky-700 mb-1">Exam link</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs text-slate-800 break-all flex-1">{examLink || '—'}</code>
                {examLink && (
                  <>
                    <button type="button" onClick={() => void copyText(examLink)} className={am.btnSecondary}>
                      <Copy size={12} /> Copy
                    </button>
                    <a href={examLink} target="_blank" rel="noreferrer" className={am.btnSecondary}>
                      <ExternalLink size={12} /> Open
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                <Users size={12} className="inline mr-1" />
                {linkCredentials.length} student credential(s) for {publishPaper.classGroup}
              </p>
              <div className="flex gap-1">
                <button type="button" onClick={exportCredentialsCsv} className={am.btnSecondary}>Export CSV</button>
                {!publishPaper.isLinkPublished && (
                  <button type="button" onClick={() => void handlePublishLink()} className={am.btnPrimary}>
                    <Send size={12} /> Generate / Refresh
                  </button>
                )}
                {publishPaper.isLinkPublished && (
                  <button
                    type="button"
                    onClick={() => void handlePublishLink()}
                    className={am.btnSecondary}
                    title="Regenerate passwords for all students"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold">Student</th>
                    <th className="text-left px-2 py-1.5 font-semibold">User ID</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {linkCredentials.map((c) => (
                    <tr key={c.studentId} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{c.studentName}</td>
                      <td className="px-2 py-1.5 font-mono">{c.userId}</td>
                      <td className="px-2 py-1.5 font-mono">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setChannel('menu')} className={am.btnSecondary}>Back</button>
              {publishPaper.isLinkPublished && (
                <button
                  type="button"
                  disabled={busyId === publishPaper.id}
                  onClick={() => void handleUnpublishLink(publishPaper)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded border border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Undo2 size={12} /> Unpublish Link
                </button>
              )}
            </div>
          </div>
        )}

        {publishPaper && channel === 'mobile' && (
          <div className="space-y-4">
            {mobileResult ? (
              <div className="text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-green-600" />
                <p className="text-sm font-semibold text-slate-800">{mobileResult.message}</p>
                <p className="text-xs text-slate-500">{mobileResult.studentCount} student(s) in class can open Tests in the app.</p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-green-50 border border-green-100 space-y-2">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone size={16} className="text-green-600" /> Live on Student Mobile App
                </p>
                <p className="text-xs text-slate-600">
                  Students already signed into the app open <strong>Tests</strong> and take this paper — no separate exam password.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setChannel('menu')} className={am.btnSecondary}>Back</button>
              {(publishPaper.isMobilePublished || mobileResult) && (
                <button
                  type="button"
                  disabled={busyId === publishPaper.id}
                  onClick={() => void handleUnpublishMobile(publishPaper)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded border border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Undo2 size={12} /> Remove from App
                </button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
