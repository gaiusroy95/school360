import { useCallback, useEffect, useState } from 'react';
import { Star, Search, Download, Smartphone, Eye } from 'lucide-react';
import {
  fetchParentFeedback, fetchParentFeedbackMeta, type FeedbackRecord,
} from '../../../lib/parentFeedbackServices';
import { fetchStudentsMeta } from '../../../lib/studentServices';
import { downloadParentFeedbackExcel } from '../../../lib/parentFeedbackExcel';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

export function ParentFeedbackView() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; averageRating: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [childClass, setChildClass] = useState('');
  const [childSection, setChildSection] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [detailRecord, setDetailRecord] = useState<FeedbackRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchParentFeedbackMeta(),
        fetchParentFeedback({
          q: searchQuery || undefined,
          className: childClass || undefined,
          sectionName: childSection || undefined,
          category: filterCategory || undefined,
        }),
      ]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, childClass, childSection, filterCategory]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((r) => setClassOptions(r.filters.classes));
  }, []);

  useEffect(() => {
    if (!childClass) {
      setSectionOptions([]);
      return;
    }
    void fetchStudentsMeta().then((r) => {
      setSectionOptions(r.filters.sectionsByClass[childClass] || []);
    });
  }, [childClass]);

  const handleExport = () => {
    downloadParentFeedbackExcel(records);
    setMessage(`Downloaded ${records.length} feedback record(s) — one row per child.`);
  };

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN');

  if (loading && !summary) return <ParentLoading label="Loading feedback…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Feedback"
        title="Parent Feedback"
        subtitle="Feedback submitted by parents via the mobile app — auto-recorded against each child with registered mobile number."
        actions={
          <button type="button" onClick={handleExport} className={pm.btnSecondary} disabled={records.length === 0}>
            <Download size={14} /> Download Excel
          </button>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

        {summary && (
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <ParentKpiCard label="Total Feedback" value={summary.total} />
            <div className={pm.kpiCard}>
              <p className={pm.kpiLabel}>Avg Rating</p>
              <p className={`${pm.kpiValue} flex items-center gap-1.5 text-amber-600`}>
                {summary.averageRating.toFixed(1)} <Star size={20} className="fill-amber-400 text-amber-400" />
              </p>
            </div>
          </div>
        )}

        <div className={`${pm.card} ${pm.cardPad} space-y-3`}>
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                placeholder="Search parent name or registered mobile…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
                className={`${pm.input} flex-1`}
              />
              <button type="button" onClick={() => void load()} className={pm.btnSecondary}>
                <Search size={14} /> Search
              </button>
            </div>
            <select value={childClass} onChange={(e) => { setChildClass(e.target.value); setChildSection(''); }} className={pm.select}>
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={childSection} onChange={(e) => setChildSection(e.target.value)} disabled={!childClass} className={pm.select}>
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={pm.select}>
              <option value="">All categories</option>
              <option value="Academic">Academic</option>
              <option value="General">General</option>
            </select>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <Smartphone size={11} /> Feedback is captured automatically when parents submit ratings on the mobile app.
          </p>
        </div>

        <ParentTableCard
          title="Feedback by Child"
          footer={`${records.length} record(s)`}
          actions={
            <button type="button" onClick={handleExport} disabled={records.length === 0} className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline disabled:opacity-40">
              <Download size={12} /> Excel
            </button>
          }
        >
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Parent</th>
                <th className={pm.th}>Mobile</th>
                <th className={pm.th}>Child</th>
                <th className={pm.th}>Rating</th>
                <th className={pm.th}>Category</th>
                <th className={pm.th}>Message</th>
                <th className={pm.th}>Source</th>
                <th className={pm.th}>Date</th>
                <th className={pm.th}>View</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400 text-sm">No feedback submitted yet via parent mobile app</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>
                    {r.parentName}
                    <p className="text-[10px] text-slate-500">{r.relationshipLabel}</p>
                  </td>
                  <td className={`${pm.td} text-xs font-mono text-slate-600`}>{r.parentMobile}</td>
                  <td className={pm.td}>
                    <div className="text-sm font-medium text-slate-800">{r.studentName}</div>
                    <div className="text-[10px] text-slate-500">{r.classGroup}</div>
                  </td>
                  <td className={pm.td}>
                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                      {r.rating}/5 <Star size={12} className="fill-amber-400 text-amber-400" />
                    </span>
                  </td>
                  <td className={pm.td}>{r.category}</td>
                  <td className={`${pm.td} max-w-[200px] truncate text-slate-500`} title={r.message}>{r.message}</td>
                  <td className={`${pm.td} text-xs text-slate-500`}>{r.sourceLabel}</td>
                  <td className={`${pm.td} text-xs text-slate-500 whitespace-nowrap`}>{formatDateTime(r.submittedAt)}</td>
                  <td className={pm.td}>
                    <button type="button" onClick={() => setDetailRecord(r)} className="text-xs text-indigo-700 font-bold flex items-center gap-1 hover:underline">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal open={!!detailRecord} onClose={() => setDetailRecord(null)} title="Feedback Details" large>
        {detailRecord && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Parent</p>
                <p className="font-semibold text-slate-900 mt-0.5">{detailRecord.parentName}</p>
                <p className="text-xs text-slate-500">{detailRecord.relationshipLabel}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Registered Mobile</p>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">{detailRecord.parentMobile}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Child</p>
                <p className="font-semibold text-slate-900 mt-0.5">{detailRecord.studentName}</p>
                <p className="text-xs text-slate-500">{detailRecord.classGroup}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Submitted</p>
                <p className="font-semibold text-slate-900 mt-0.5">{formatDateTime(detailRecord.submittedAt)}</p>
                <p className="text-xs text-slate-500">{detailRecord.sourceLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} className={detailRecord.rating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
              ))}
              <span className="text-sm font-bold text-amber-600 ml-1">{detailRecord.rating}/5</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Category</p>
              <p className="text-slate-800">{detailRecord.category}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Feedback Message</p>
              <p className="text-slate-700 p-3 rounded-lg border border-slate-200 bg-white whitespace-pre-wrap leading-relaxed">
                {detailRecord.message}
              </p>
            </div>
          </div>
        )}
      </ParentModal>
    </ParentPageShell>
  );
}
