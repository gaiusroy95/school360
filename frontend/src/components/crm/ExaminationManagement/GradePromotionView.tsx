import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, GraduationCap, Loader2, RefreshCw, Users, XCircle,
} from 'lucide-react';
import {
  EligiblePromotionStudent,
  fetchEligiblePromotionStudents,
  fetchGradePromotionMeta,
  fetchPromotionBatches,
  promoteStudents,
  seedGradePromotion,
  type PromotionBatch,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'eligible' | 'promote' | 'history';

export function GradePromotionView() {
  const [tab, setTab] = useState<Tab>('eligible');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchGradePromotionMeta>> | null>(null);
  const [students, setStudents] = useState<EligiblePromotionStudent[]>([]);
  const [batches, setBatches] = useState<PromotionBatch[]>([]);
  const [summary, setSummary] = useState({ total: 0, passed: 0, alreadyPromoted: 0, pending: 0 });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [toAcademicYear, setToAcademicYear] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (className && s.className !== className) return false;
      if (sectionName && s.sectionName !== sectionName) return false;
      return true;
    });
  }, [students, className, sectionName]);

  const pendingStudents = useMemo(
    () => filteredStudents.filter((s) => !s.alreadyPromoted),
    [filteredStudents],
  );

  const selectedStudents = useMemo(
    () => pendingStudents.filter((s) => selected.has(s.studentId)),
    [pendingStudents, selected],
  );

  const nextClassPreview = useMemo(() => {
    if (!selectedStudents.length) return '—';
    const classes = [...new Set(selectedStudents.map((s) => s.nextClass))];
    return classes.join(', ');
  }, [selectedStudents]);

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchGradePromotionMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
        setToAcademicYear(m.nextAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let data = await fetchEligiblePromotionStudents({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
      });
      if (!data.students.length) {
        await seedGradePromotion(yearFilter);
        data = await fetchEligiblePromotionStudents({
          academicYear: yearFilter,
          className: className || undefined,
          sectionName: sectionName || undefined,
        });
      }
      const batchData = await fetchPromotionBatches(yearFilter);
      setStudents(data.students);
      setSummary(data.summary);
      setToAcademicYear(data.nextAcademicYear);
      setBatches(batchData.batches);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName]);

  useEffect(() => { void load(); }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(pendingStudents.map((s) => s.studentId)));
  };

  const clearSelection = () => setSelected(new Set());

  const handlePromote = async () => {
    if (!selectedStudents.length || !className || !sectionName) return;
    setActionLoading(true);
    try {
      const result = await promoteStudents({
        studentIds: selectedStudents.map((s) => s.studentId),
        fromAcademicYear: academicYear,
        toAcademicYear,
        fromClassName: className,
        fromSectionName: sectionName,
        toClassName: selectedStudents[0]?.nextClass,
        toSectionName: sectionName,
      });
      setSuccessMsg(result.message);
      setConfirmOpen(false);
      setSelected(new Set());
      await load(academicYear);
      setTab('history');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Promotion failed');
      setConfirmOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'eligible', label: 'Passed Students' },
    { id: 'promote', label: 'Promote' },
    { id: 'history', label: 'Promotion History' },
  ];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Grade & Promotion"
        title="Grade & Promotion"
        subtitle="Auto-mapped passed students · class-wise promotion to next session with full history"
        actions={(
          <div className="flex items-center gap-2">
            <select value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); void load(e.target.value); }} className={am.select}>
              {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Passed Students', value: summary.passed, color: 'text-blue-600' },
          { label: 'Pending Promotion', value: summary.pending, color: 'text-amber-600' },
          { label: 'Already Promoted', value: summary.alreadyPromoted, color: 'text-green-600' },
          { label: 'Promotion Batches', value: batches.length, color: 'text-purple-600' },
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
          {(tab === 'eligible' || tab === 'promote') && (
            <div className={`${am.card} ${am.cardPad} mb-4`}>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-slate-600">Class</label>
                  <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); setSelected(new Set()); }} className={am.select}>
                    <option value="">All Classes</option>
                    {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-slate-600">Section</label>
                  <select value={sectionName} onChange={(e) => { setSectionName(e.target.value); setSelected(new Set()); }} className={am.select} disabled={!className}>
                    <option value="">All Sections</option>
                    {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={selectAll} className={am.btnSecondary} disabled={!pendingStudents.length}>
                    Select All ({pendingStudents.length})
                  </button>
                  <button type="button" onClick={clearSelection} className={am.btnSecondary} disabled={!selected.size}>
                    Clear ({selected.size})
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'eligible' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Passed Students (Auto-Mapped from Published Results)</h3>
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400">No passed students found. Publish exam results first.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                        <th className={`${am.th} w-10`}>Select</th>
                        <th className={am.th}>Student</th>
                        <th className={am.th}>Class</th>
                        <th className={am.th}>Result</th>
                        <th className={am.th}>Next Class</th>
                        <th className={am.th}>Parents</th>
                        <th className={am.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => (
                        <tr key={s.studentId} className={`border-b border-slate-100 ${s.alreadyPromoted ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                          <td className={am.td}>
                            {!s.alreadyPromoted && (
                              <input
                                type="checkbox"
                                checked={selected.has(s.studentId)}
                                onChange={() => toggleSelect(s.studentId)}
                                className="rounded border-slate-300"
                              />
                            )}
                          </td>
                          <td className={am.td}>
                            <div className="font-medium">{s.studentName}</div>
                            <div className="text-[10px] text-slate-500">{s.admissionNumber}</div>
                          </td>
                          <td className={am.td}>{s.classGroup}</td>
                          <td className={am.td}>{s.percentage}% ({s.grade})</td>
                          <td className={am.td}>
                            <span className="flex items-center gap-1 text-emerald-700">
                              <ArrowRight size={10} /> {s.nextClass} — {s.nextSection}
                            </span>
                          </td>
                          <td className={am.td}>
                            <div className="text-[10px]">{s.fatherName || '—'}</div>
                            <div className="text-[10px] text-slate-400">{s.motherName || ''}</div>
                          </td>
                          <td className={am.td}>
                            {s.alreadyPromoted ? (
                              <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] text-green-800">Promoted</span>
                            ) : (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selected.size > 0 && (
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => setTab('promote')} className={am.btnPrimary}>
                    <GraduationCap size={14} /> Continue to Promote ({selected.size} selected)
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'promote' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Promote to Next Session</h3>
              {!className || !sectionName ? (
                <p className="text-xs text-amber-600">Select a class and section filter above to promote students.</p>
              ) : selectedStudents.length === 0 ? (
                <p className="text-xs text-slate-400">No students selected. Go to Passed Students tab and select students to promote.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-slate-500">From Session</p>
                        <p className="font-semibold text-slate-800">{academicYear}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">To Session</p>
                        <select value={toAcademicYear} onChange={(e) => setToAcademicYear(e.target.value)} className={am.select}>
                          {[toAcademicYear, ...(meta?.academicYears || [])].filter((v, i, a) => a.indexOf(v) === i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-slate-500">From Class</p>
                        <p className="font-semibold">{className} — {sectionName}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">To Class</p>
                        <p className="font-semibold text-emerald-700">{nextClassPreview} — {sectionName}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-700">
                      <Users size={12} className="inline mr-1" />
                      {selectedStudents.length} student(s) selected for promotion
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                      {selectedStudents.map((s) => (
                        <div key={s.studentId} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs last:border-0">
                          <span>{s.studentName} ({s.admissionNumber})</span>
                          <span className="text-slate-500">{s.percentage}% → {s.nextClass}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Student data and parent details (father/mother) will move with the student.
                    Previous session results will be recorded in student session history.
                  </p>

                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={actionLoading || !toAcademicYear}
                    className={am.btnPrimary}
                  >
                    <GraduationCap size={14} /> Promote {selectedStudents.length} Student(s)
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Promotion History</h3>
              {batches.length === 0 ? (
                <p className="text-xs text-slate-400">No promotions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                        <th className={am.th}>Batch ID</th>
                        <th className={am.th}>Class Change</th>
                        <th className={am.th}>Session</th>
                        <th className={am.th}>Students</th>
                        <th className={am.th}>Promoted By</th>
                        <th className={am.th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => (
                        <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className={am.td}>{b.recordId}</td>
                          <td className={am.td}>{b.classGroup}</td>
                          <td className={am.td}>{b.fromAcademicYear} → {b.toAcademicYear}</td>
                          <td className={am.td}>{b.studentCount}</td>
                          <td className={am.td}>{b.promotedBy}</td>
                          <td className={am.td}>{new Date(b.promotedAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AcademicModal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Promotion">
        <div className="space-y-4 text-sm">
          <p>
            Promote <strong>{selectedStudents.length}</strong> student(s) from{' '}
            <strong>{className} — {sectionName}</strong> ({academicYear}) to{' '}
            <strong>{nextClassPreview} — {sectionName}</strong> ({toAcademicYear})?
          </p>
          <ul className="list-inside list-disc text-xs text-slate-600">
            <li>Student class, section, and session will be updated</li>
            <li>Parent details (father/mother) move with the student</li>
            <li>Previous session results recorded in student history</li>
            <li>This action cannot be easily undone</li>
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={() => void handlePromote()} disabled={actionLoading} className={am.btnPrimary}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Yes, Promote
            </button>
            <button type="button" onClick={() => setConfirmOpen(false)} className={am.btnSecondary}>Cancel</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
