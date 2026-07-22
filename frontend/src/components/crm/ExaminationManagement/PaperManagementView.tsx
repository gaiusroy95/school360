import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Eye, Filter, Loader2, RefreshCw, Send, Smartphone,
  Undo2, Users,
} from 'lucide-react';
import {
  fetchPaperManagementMeta,
  fetchPaperManagementPapers,
  publishPaperToMobile,
  seedPaperManagement,
  unpublishPaperFromMobile,
  type ExamPaperPurpose,
  type PaperManagementRecord,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const PURPOSE_COLORS: Partial<Record<ExamPaperPurpose, string>> = {
  CLASS_TEST: 'bg-emerald-100 text-emerald-800',
  UNIT_TEST: 'bg-blue-100 text-blue-800',
  MID_TERM: 'bg-amber-100 text-amber-800',
  ANNUAL_EXAM: 'bg-purple-100 text-purple-800',
  ENTRANCE_TEST: 'bg-red-100 text-red-800',
  PRACTICE: 'bg-slate-100 text-slate-700',
};

export function PaperManagementView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchPaperManagementMeta>> | null>(null);
  const [papers, setPapers] = useState<PaperManagementRecord[]>([]);
  const [summary, setSummary] = useState({
    totalPapers: 0, mobilePublished: 0, mobilePending: 0, digitalExams: 0, totalQuestions: 0,
  });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [purpose, setPurpose] = useState('all');
  const [mobileStatus, setMobileStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [publishModal, setPublishModal] = useState<PaperManagementRecord | null>(null);
  const [visibleOn, setVisibleOn] = useState<'APP' | 'BOTH'>('BOTH');
  const [publishResult, setPublishResult] = useState<Awaited<ReturnType<typeof publishPaperToMobile>> | null>(null);

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
      let data = await fetchPaperManagementPapers({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
        subjectName: subjectName || undefined,
        purpose: purpose !== 'all' ? purpose : undefined,
        mobileStatus: mobileStatus !== 'all' ? mobileStatus : undefined,
      });
      if (!data.papers.length) {
        await seedPaperManagement(yearFilter);
        data = await fetchPaperManagementPapers({
          academicYear: yearFilter,
          className: className || undefined,
          sectionName: sectionName || undefined,
          subjectName: subjectName || undefined,
          purpose: purpose !== 'all' ? purpose : undefined,
          mobileStatus: mobileStatus !== 'all' ? mobileStatus : undefined,
        });
      }
      setPapers(data.papers);
      setSummary(data.summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName, subjectName, purpose, mobileStatus]);

  useEffect(() => { void load(); }, [load]);

  const handlePublish = async () => {
    if (!publishModal) return;
    setPublishingId(publishModal.id);
    setErrorMsg(null);
    try {
      const result = await publishPaperToMobile(publishModal.id, visibleOn);
      setPublishResult(result);
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublish = async (paper: PaperManagementRecord) => {
    setPublishingId(paper.id);
    try {
      const result = await unpublishPaperFromMobile(paper.id);
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unpublish failed');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading && !papers.length) return <AcademicLoading label="Loading question papers…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Paper Management"
        title="Paper Management"
        subtitle="All question papers from Question Bank — publish to student & parent mobile apps for digital tests"
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
          <select value={mobileStatus} onChange={(e) => setMobileStatus(e.target.value)} className={am.select}>
            <option value="all">All Mobile Status</option>
            <option value="published">Published to Mobile</option>
            <option value="pending">Not on Mobile</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-slate-500 uppercase">Total Papers</p><p className="text-2xl font-bold">{summary.totalPapers}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-green-600 uppercase">On Mobile</p><p className="text-2xl font-bold">{summary.mobilePublished}</p></div>
          <div className={`${am.card} ${am.cardPad}`}><p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p><p className="text-2xl font-bold">{summary.mobilePending}</p></div>
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
                <th className={am.th}>Duration</th>
                <th className={am.th}>Mobile Status</th>
                <th className={am.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {papers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">No question papers found. Create papers in Question Bank first.</td></tr>
              ) : papers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className={am.td}>
                    <p className="font-semibold text-slate-900 text-sm">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.recordId} · {p.sourceLabel}</p>
                  </td>
                  <td className={am.td}>{p.classGroup}</td>
                  <td className={`${am.td} font-medium`}>{p.subjectName}</td>
                  <td className={am.td}>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PURPOSE_COLORS[p.purpose] || ''}`}>{p.purposeLabel}</span>
                  </td>
                  <td className={am.td}>{p.questionCount}</td>
                  <td className={am.td}>{p.durationMinutes} min</td>
                  <td className={am.td}>
                    {p.isMobilePublished ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <Smartphone size={10} /> Live on Mobile
                        </span>
                        <p className="text-[9px] text-slate-500 mt-0.5">{p.mobileVisibleOn}</p>
                        {p.mobilePublishedAt && (
                          <p className="text-[9px] text-slate-400">{new Date(p.mobilePublishedAt).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">Not published</span>
                    )}
                  </td>
                  <td className={am.td}>
                    <div className="flex flex-wrap gap-1">
                      {p.isMobilePublished ? (
                        <button
                          type="button"
                          disabled={publishingId === p.id}
                          onClick={() => void handleUnpublish(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          {publishingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <Undo2 size={10} />}
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!p.canPublishToMobile || publishingId === p.id}
                          onClick={() => { setPublishModal(p); setPublishResult(null); setVisibleOn('BOTH'); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Send size={10} /> Publish to Mobile
                        </button>
                      )}
                      {p.isDigitalExam && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[9px] rounded bg-purple-50 text-purple-700 border border-purple-100">
                          <Eye size={10} /> Auto-score
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${am.card} ${am.cardPad}`}>
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Mobile App Publishing</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Published papers appear on the student and parent mobile apps for the matching class and section.
            Digital exam papers support auto-check and instant scoring when students take the test on mobile.
          </p>
        </div>
      </div>

      <AcademicModal
        open={!!publishModal}
        onClose={() => { setPublishModal(null); setPublishResult(null); }}
        title="Publish to Mobile App"
        large
      >
        {publishModal && !publishResult && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-bold text-slate-900">{publishModal.title}</p>
              <p className="text-xs text-slate-500 mt-1">{publishModal.classGroup} · {publishModal.subjectName}</p>
              <p className="text-xs text-slate-500">{publishModal.questionCount} questions · {publishModal.durationMinutes} min · Pass {publishModal.passMarksPercent}%</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Visible On</label>
              <select value={visibleOn} onChange={(e) => setVisibleOn(e.target.value as 'APP' | 'BOTH')} className={`${am.select} w-full mt-1`}>
                {(meta?.visibilityOptions || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Users size={12} />
              Students in {publishModal.className}{publishModal.sectionName ? ` — ${publishModal.sectionName}` : ''} will see this test on their mobile app.
            </p>
            <button type="button" onClick={() => void handlePublish()} disabled={publishingId === publishModal.id} className={`${am.btnPrimary} w-full`}>
              {publishingId === publishModal.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Publish for Mobile Test
            </button>
          </div>
        )}
        {publishResult && (
          <div className="space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-600" />
            <p className="text-sm font-semibold text-slate-800">{publishResult.message}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-indigo-50 rounded"><span className="font-bold text-indigo-700">{publishResult.targetAudience}</span></div>
              <div className="p-2 bg-green-50 rounded"><span className="font-bold text-green-700">{publishResult.studentCount}</span> students notified</div>
            </div>
            <button type="button" onClick={() => { setPublishModal(null); setPublishResult(null); }} className={am.btnSecondary}>Close</button>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
