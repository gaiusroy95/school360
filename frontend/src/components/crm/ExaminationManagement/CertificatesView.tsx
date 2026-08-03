import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, CheckCircle2, Download, FileText, Loader2, Plus, Printer, RefreshCw,
  Smartphone, XCircle,
} from 'lucide-react';
import {
  CoScholasticCertificate,
  createCertificateFromAdmin,
  fetchCertificatePreview,
  fetchCertificates,
  fetchCertificatesMeta,
  generateAllCertificates,
  generateCertificates,
  issueCertificates,
} from '../../../lib/examinationServices';
import { fetchStudents, type Student } from '../../../lib/studentServices';
import { downloadCertificatePdf } from '../../../lib/certificatePdf';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'create' | 'templates' | 'records' | 'generate' | 'mobile';

const STATUS_COLORS: Record<string, string> = {
  RECORDED: 'bg-amber-100 text-amber-800',
  GENERATED: 'bg-blue-100 text-blue-800',
  ISSUED: 'bg-emerald-100 text-emerald-800',
};

const CATEGORY_SHORT: Record<string, string> = {
  PHYSICAL_HEALTH: 'Physical & Health',
  WORK_EDUCATION: 'Work Education',
  VISUAL_PERFORMING_ARTS: 'Visual & Performing Arts',
  LEADERSHIP_COMMUNITY: 'Leadership & Community',
};

function scorePreview(score: number, maxScore: number) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'E';
  const band = pct >= 85 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 55 ? 'Average' : 'Needs Improvement';
  return { grade, band };
}

export function CertificatesView() {
  const [tab, setTab] = useState<Tab>('create');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchCertificatesMeta>> | null>(null);
  const [certificates, setCertificates] = useState<CoScholasticCertificate[]>([]);
  const [summary, setSummary] = useState({
    total: 0, recorded: 0, generated: 0, issued: 0,
    byCategory: [] as { category: string; label: string; count: number }[],
  });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formClass, setFormClass] = useState('');
  const [formSection, setFormSection] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formCategory, setFormCategory] = useState('PHYSICAL_HEALTH');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formTerm, setFormTerm] = useState('Annual');
  const [formScore, setFormScore] = useState('85');
  const [formMaxScore, setFormMaxScore] = useState('100');
  const [formRemarks, setFormRemarks] = useState('');
  const [formRecordedBy, setFormRecordedBy] = useState('');
  const [formGenerate, setFormGenerate] = useState(true);
  const [formIssue, setFormIssue] = useState(false);
  const [createdPreview, setCreatedPreview] = useState<CoScholasticCertificate | null>(null);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const formSectionOptions = useMemo(() => {
    if (!meta || !formClass) return [];
    return meta.sectionsByClass[formClass] || [];
  }, [meta, formClass]);

  const categoryMeta = useMemo(
    () => (meta?.categories || []).find((c) => c.id === formCategory) || null,
    [meta, formCategory],
  );

  const subCategoryMeta = useMemo(
    () => categoryMeta?.subCategories.find((s) => s.id === formSubCategory) || null,
    [categoryMeta, formSubCategory],
  );

  const previewGrade = useMemo(() => {
    const score = Number(formScore);
    const max = Number(formMaxScore) || 100;
    if (Number.isNaN(score)) return null;
    return scorePreview(score, max);
  }, [formScore, formMaxScore]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      if (className && c.className !== className) return false;
      if (sectionName && c.sectionName !== sectionName) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (status !== 'all' && c.status !== status) return false;
      return true;
    });
  }, [certificates, className, sectionName, category, status]);

  const selectableIds = useMemo(
    () => filteredCertificates.filter((c) => c.canGenerate || c.canIssue).map((c) => c.id),
    [filteredCertificates],
  );

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchCertificatesMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
        if (m.classes[0]) setFormClass(m.classes[0]);
        if (m.categories?.[0]) setFormCategory(m.categories[0].id);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      const data = await fetchCertificates({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
      });
      setCertificates(data.certificates);
      setSummary(data.summary);
      setSelected(new Set());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName, category, status]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!formClass) {
      setStudents([]);
      setFormStudentId('');
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    void fetchStudents({
      academicYear,
      className: formClass,
      sectionName: formSection || undefined,
      status: 'ACTIVE',
      pageSize: 200,
      viewAll: true,
    }).then((res) => {
      if (cancelled) return;
      setStudents(res.students);
      setFormStudentId((prev) => (res.students.some((s) => s.id === prev) ? prev : (res.students[0]?.id || '')));
    }).catch(() => {
      if (!cancelled) setStudents([]);
    }).finally(() => {
      if (!cancelled) setStudentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [formClass, formSection, academicYear]);

  useEffect(() => {
    if (!categoryMeta) return;
    const firstSub = categoryMeta.subCategories[0]?.id || '';
    setFormSubCategory((prev) => (categoryMeta.subCategories.some((s) => s.id === prev) ? prev : firstSub));
  }, [categoryMeta]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(selectableIds));
  const clearSelection = () => setSelected(new Set());

  const resetCreateForm = () => {
    setFormActivity('');
    setFormScore('85');
    setFormMaxScore('100');
    setFormRemarks('');
    setFormIssue(false);
    setFormGenerate(true);
    setCreatedPreview(null);
  };

  const handleCreateCertificate = async () => {
    if (!formStudentId) {
      setErrorMsg('Select a student');
      return;
    }
    if (!formActivity.trim()) {
      setErrorMsg('Enter the activity / achievement title');
      return;
    }
    const score = Number(formScore);
    if (Number.isNaN(score)) {
      setErrorMsg('Enter a valid performance score');
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const result = await createCertificateFromAdmin({
        studentId: formStudentId,
        category: formCategory,
        activityTitle: formActivity.trim(),
        subCategory: subCategoryMeta?.label || formSubCategory,
        academicYear,
        term: formTerm,
        performanceScore: score,
        maxScore: Number(formMaxScore) || 100,
        remarks: formRemarks,
        recordedBy: formRecordedBy || undefined,
        generate: formGenerate,
        issue: formIssue,
      });
      setSuccessMsg(result.message);
      setCreatedPreview(result.certificate);
      await load(academicYear);
      if (result.certificate.status !== 'RECORDED') {
        const preview = await fetchCertificatePreview(result.certificate.id);
        downloadCertificatePdf(preview);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateSelected = async () => {
    const ids = [...selected].filter((id) => certificates.find((x) => x.id === id)?.canGenerate);
    if (!ids.length) return;
    setActionLoading(true);
    try {
      const result = await generateCertificates(ids);
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
      const result = await generateAllCertificates({
        academicYear,
        className: className || undefined,
        sectionName: sectionName || undefined,
        category: category !== 'all' ? category : undefined,
      });
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueSelected = async () => {
    const ids = [...selected].filter((id) => certificates.find((x) => x.id === id)?.canIssue);
    if (!ids.length) return;
    setActionLoading(true);
    try {
      const result = await issueCertificates(ids);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreview = async (cert: CoScholasticCertificate) => {
    if (cert.status === 'RECORDED') {
      setErrorMsg('Generate the certificate before preview/download');
      return;
    }
    setPreviewLoading(cert.id);
    try {
      const preview = await fetchCertificatePreview(cert.id);
      downloadCertificatePdf(preview);
      setSuccessMsg(`Certificate downloaded for ${cert.studentName}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'create', label: 'Create Certificate' },
    { id: 'templates', label: 'Default Designs' },
    { id: 'records', label: 'All Records' },
    { id: 'generate', label: 'Generate & Issue' },
    { id: 'mobile', label: 'Teacher Mobile App' },
  ];

  if (loading && !meta) return <AcademicLoading label="Loading certificates…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Certificates"
        title="Co-Scholastic Certificates"
        subtitle="Admin can enter performance and generate certificates · also syncs from teacher mobile / co-scholastic records"
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
            <button type="button" onClick={() => { setTab('create'); resetCreateForm(); }} className={am.btnPrimary}>
              <Plus size={14} /> New Certificate
            </button>
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Records', value: summary.total, color: 'text-slate-700' },
          { label: 'Recorded', value: summary.recorded, color: 'text-amber-600' },
          { label: 'Generated', value: summary.generated, color: 'text-blue-600' },
          { label: 'Issued', value: summary.issued, color: 'text-emerald-600' },
        ].map((k) => (
          <div key={k.label} className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {tab !== 'create' && (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className={am.label}>Class</label>
            <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={am.select}>
              <option value="">All Classes</option>
              {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={am.label}>Section</label>
            <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={am.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={am.select}>
              <option value="all">All Categories</option>
              {(meta?.templateDesigns || []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={am.label}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={am.select}>
              <option value="all">All Status</option>
              <option value="RECORDED">Recorded</option>
              <option value="GENERATED">Generated</option>
              <option value="ISSUED">Issued</option>
            </select>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t px-3 py-1.5 text-xs font-medium transition ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AcademicLoading label="Loading…" />
      ) : tab === 'create' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className={`${am.card} ${am.cardPad} lg:col-span-3 space-y-4`}>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Enter performance &amp; generate certificate</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select student, enter activity and score. Grade/band are calculated automatically.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={am.label}>Class *</label>
                <select
                  value={formClass}
                  onChange={(e) => { setFormClass(e.target.value); setFormSection(''); }}
                  className={am.select}
                >
                  <option value="">Select class</option>
                  {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={am.label}>Section</label>
                <select value={formSection} onChange={(e) => setFormSection(e.target.value)} className={am.select}>
                  <option value="">All sections</option>
                  {formSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={am.label}>Student *</label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className={am.select}
                  disabled={studentsLoading || !formClass}
                >
                  {!formClass && <option value="">Select class first</option>}
                  {formClass && studentsLoading && <option value="">Loading…</option>}
                  {formClass && !studentsLoading && students.length === 0 && <option value="">No active students</option>}
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName || s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={am.label}>Category *</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={am.select}>
                  {(meta?.categories?.length ? meta.categories : meta?.templateDesigns || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={am.label}>Sub-category</label>
                <select value={formSubCategory} onChange={(e) => setFormSubCategory(e.target.value)} className={am.select}>
                  {(categoryMeta?.subCategories || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={am.label}>Activity / Achievement *</label>
              <input
                value={formActivity}
                onChange={(e) => setFormActivity(e.target.value)}
                className={am.input}
                placeholder="e.g. Inter-school Football Championship"
                list="cert-activity-suggestions"
              />
              <datalist id="cert-activity-suggestions">
                {(subCategoryMeta?.activities || []).map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              {subCategoryMeta?.activities?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {subCategoryMeta.activities.slice(0, 8).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setFormActivity(a)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={am.label}>Score *</label>
                <input type="number" min={0} value={formScore} onChange={(e) => setFormScore(e.target.value)} className={am.input} />
              </div>
              <div>
                <label className={am.label}>Max Score</label>
                <input type="number" min={1} value={formMaxScore} onChange={(e) => setFormMaxScore(e.target.value)} className={am.input} />
              </div>
              <div>
                <label className={am.label}>Term</label>
                <select value={formTerm} onChange={(e) => setFormTerm(e.target.value)} className={am.select}>
                  <option value="Annual">Annual</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div>
                <label className={am.label}>Recorded By</label>
                <input
                  value={formRecordedBy}
                  onChange={(e) => setFormRecordedBy(e.target.value)}
                  className={am.input}
                  placeholder="Teacher / Admin"
                />
              </div>
            </div>

            {previewGrade && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Auto grade: <strong>{previewGrade.grade}</strong>
                &nbsp;·&nbsp; Band: <strong>{previewGrade.band}</strong>
              </div>
            )}

            <div>
              <label className={am.label}>Remarks</label>
              <textarea
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                className={am.input}
                rows={2}
                placeholder="Optional remarks printed on the certificate"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={formGenerate} onChange={(e) => setFormGenerate(e.target.checked)} />
                Generate certificate now (PDF download)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formIssue}
                  onChange={(e) => {
                    setFormIssue(e.target.checked);
                    if (e.target.checked) setFormGenerate(true);
                  }}
                />
                Mark as Issued
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={actionLoading} onClick={() => void handleCreateCertificate()} className={am.btnPrimary}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                {formGenerate ? 'Generate Certificate' : 'Record Performance'}
              </button>
              <button type="button" onClick={resetCreateForm} className={am.btnSecondary}>Clear Form</button>
            </div>
          </div>

          <div className={`${am.card} ${am.cardPad} lg:col-span-2 space-y-3`}>
            <h3 className="text-sm font-semibold text-slate-800">Preview summary</h3>
            {createdPreview ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1 text-xs text-emerald-900">
                <p className="font-semibold">{createdPreview.studentName}</p>
                <p>{createdPreview.activityTitle}</p>
                <p>
                  {createdPreview.performanceScore} · {createdPreview.performanceGrade} · {createdPreview.performanceBandLabel}
                </p>
                <p>Status: {createdPreview.status}</p>
                {createdPreview.status !== 'RECORDED' && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-blue-700 hover:underline"
                    onClick={() => void handlePreview(createdPreview)}
                  >
                    <Download size={12} /> Download PDF again
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Fill the form and generate. Uses the category design template and school branding.
              </p>
            )}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              Teachers can also record from the mobile app; those records appear under Generate &amp; Issue.
            </div>
          </div>
        </div>
      ) : tab === 'templates' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(meta?.templateDesigns || []).map((design) => {
            const count = summary.byCategory.find((b) => b.category === design.id)?.count ?? 0;
            return (
              <div key={design.id} className={`${am.card} overflow-hidden`}>
                <div className="h-2" style={{ background: `linear-gradient(90deg, ${design.colors.primary}, ${design.colors.accent})` }} />
                <div className="p-4" style={{ backgroundColor: design.colors.bg }}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Award size={20} style={{ color: design.colors.primary }} />
                      <h3 className="text-sm font-semibold" style={{ color: design.colors.primary }}>{design.label}</h3>
                    </div>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">{count} records</span>
                  </div>
                  <p className="mb-4 text-xs text-slate-600">{design.description}</p>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                    onClick={() => { setFormCategory(design.id); setTab('create'); }}
                  >
                    Create certificate in this category →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'mobile' ? (
        <div className={`${am.card} ${am.cardPad}`}>
          <div className="mb-4 flex items-center gap-2">
            <Smartphone size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">Teacher Mobile App Integration</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Teacher record</p>
              <code className="block rounded bg-slate-800 px-2 py-1.5 text-[10px] text-green-300">
                POST /api/examination/certificates/mobile/record
              </code>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Admin create (performance)</p>
              <code className="block rounded bg-slate-800 px-2 py-1.5 text-[10px] text-green-300">
                POST /api/examination/certificates/record
              </code>
            </div>
          </div>
        </div>
      ) : tab === 'generate' ? (
        <div className="space-y-4">
          <div className={`${am.card} ${am.cardPad} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="text-sm font-semibold text-slate-800">Batch Actions</p>
              <p className="text-xs text-slate-500">
                {selected.size} selected · {filteredCertificates.filter((c) => c.canGenerate).length} ready to generate · {filteredCertificates.filter((c) => c.canIssue).length} ready to issue
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={selectAll} className={am.btnSecondary} disabled={!selectableIds.length}>Select All</button>
              <button type="button" onClick={clearSelection} className={am.btnSecondary}>Clear</button>
              <button type="button" onClick={() => void handleGenerateSelected()} disabled={actionLoading || !selected.size} className={am.btnPrimary}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                Generate Selected
              </button>
              <button type="button" onClick={() => void handleGenerateAll()} disabled={actionLoading} className={am.btnPrimary}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Generate All Recorded
              </button>
              <button type="button" onClick={() => void handleIssueSelected()} disabled={actionLoading || !selected.size} className={am.btnSecondary}>
                <CheckCircle2 size={14} /> Issue Selected
              </button>
            </div>
          </div>
          <CertificateTable
            certificates={filteredCertificates}
            selected={selected}
            onToggle={toggleSelect}
            onPreview={(c) => void handlePreview(c)}
            previewLoading={previewLoading}
            showCheckbox
          />
        </div>
      ) : (
        <CertificateTable
          certificates={filteredCertificates}
          selected={selected}
          onToggle={toggleSelect}
          onPreview={(c) => void handlePreview(c)}
          previewLoading={previewLoading}
        />
      )}
    </AcademicPageShell>
  );
}

function CertificateTable({
  certificates,
  selected,
  onToggle,
  onPreview,
  previewLoading,
  showCheckbox = false,
}: {
  certificates: CoScholasticCertificate[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onPreview: (c: CoScholasticCertificate) => void;
  previewLoading: string | null;
  showCheckbox?: boolean;
}) {
  return (
    <div className={`${am.card} overflow-x-auto`}>
      <table className={am.table}>
        <thead>
          <tr>
            {showCheckbox && <th className={am.th} />}
            <th className={am.th}>Student</th>
            <th className={am.th}>Class / Section</th>
            <th className={am.th}>Category</th>
            <th className={am.th}>Activity</th>
            <th className={am.th}>Performance</th>
            <th className={am.th}>Recorded By</th>
            <th className={am.th}>Status</th>
            <th className={am.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((c) => (
            <tr key={c.id} className={am.tr}>
              {showCheckbox && (
                <td className={am.td}>
                  {(c.canGenerate || c.canIssue) && (
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => onToggle(c.id)}
                      className="rounded"
                    />
                  )}
                </td>
              )}
              <td className={am.td}>
                <p className="font-medium text-slate-800">{c.studentName}</p>
                <p className="text-[10px] text-slate-400">{c.admissionNumber}</p>
              </td>
              <td className={am.td}>{c.className} — {c.sectionName}</td>
              <td className={am.td}>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: c.templateDesign?.colors.bg || '#f1f5f9',
                    color: c.templateDesign?.colors.primary || '#334155',
                  }}
                >
                  {CATEGORY_SHORT[c.category] || c.categoryLabel}
                </span>
              </td>
              <td className={am.td}>
                <p className="text-xs">{c.activityTitle}</p>
                {c.subCategory && <p className="text-[10px] text-slate-400">{c.subCategory}</p>}
              </td>
              <td className={am.td}>
                <p className="text-xs">{c.performanceScore} — {c.performanceGrade}</p>
                <p className="text-[10px] text-slate-400">{c.performanceBandLabel}</p>
              </td>
              <td className={am.td}>
                <p className="text-xs">{c.recordedBy}</p>
                <p className="text-[10px] text-slate-400">{new Date(c.recordedAt).toLocaleDateString('en-IN')}</p>
              </td>
              <td className={am.td}>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                  {c.status}
                </span>
              </td>
              <td className={am.td}>
                <button
                  type="button"
                  onClick={() => onPreview(c)}
                  disabled={c.status === 'RECORDED' || previewLoading === c.id}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:text-slate-300"
                >
                  {previewLoading === c.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  PDF
                </button>
              </td>
            </tr>
          ))}
          {!certificates.length && (
            <tr>
              <td colSpan={showCheckbox ? 9 : 8} className={`${am.td} py-8 text-center text-slate-400`}>
                No certificates found for the selected filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
