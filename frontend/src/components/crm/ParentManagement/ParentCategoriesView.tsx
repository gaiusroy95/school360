import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Download, X, Users, ChevronRight, Target, Lightbulb, Search,
} from 'lucide-react';
import { toViewKey } from '../../../lib/navigation';
import {
  fetchParentCategoryAnalytics,
  type ParentSegmentId,
  type ParentSegmentParent,
  type SegmentDefinition,
} from '../../../lib/parentCategoryServices';
import { downloadParentSegmentsExcel } from '../../../lib/parentCategoriesExcel';
import {
  ParentLoading, ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

type Props = { onNavigate?: (view: string) => void };

const SEGMENT_ACTIONS: Record<ParentSegmentId, { label: string; page: string }[]> = {
  champions: [
    { label: 'Send Milestone Report', page: 'Communication Log' },
    { label: 'Invite Mentor Role', page: 'Parents Engagement' },
  ],
  silent_trusters: [
    { label: 'Schedule Weekly Digest', page: 'Communication Log' },
  ],
  anxious_intense: [
    { label: 'Set Office Hours', page: 'Parents Engagement' },
    { label: 'Send Effort Feedback', page: 'Communication Log' },
  ],
  disconnected: [
    { label: 'Positive News Message', page: 'Communication Log' },
    { label: 'Schedule PTM', page: 'Parent Meetings (PTM)' },
    { label: 'Send SMS', page: 'Communication Log' },
  ],
};

export function ParentCategoriesView({ onNavigate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<{
    totalParentCategories: number;
    activeOpen: number;
    pending: number;
    thisMonth: number;
    segmented: number;
  } | null>(null);
  const [segments, setSegments] = useState<SegmentDefinition[]>([]);
  const [parents, setParents] = useState<ParentSegmentParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<ParentSegmentId | null>(null);
  const [selectedParent, setSelectedParent] = useState<ParentSegmentParent | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const nav = useCallback(
    (page: string) => onNavigate?.(toViewKey('Parent Management', page)),
    [onNavigate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchParentCategoryAnalytics({ q: search || undefined });
      setSummary(data.summary);
      setSegments(data.segments);
      setParents(data.parents);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const displayedParents = useMemo(() => {
    const list = selectedSegment
      ? parents.filter((p) => p.segmentId === selectedSegment)
      : parents;
    return [...list].sort((a, b) => a.childPerformanceScore - b.childPerformanceScore);
  }, [parents, selectedSegment]);

  const downloadCategoryExcel = (segmentId: ParentSegmentId, label?: string) => {
    const segment = segments.find((s) => s.id === segmentId);
    const categoryParents = parents
      .filter((p) => p.segmentId === segmentId)
      .sort((a, b) => a.childPerformanceScore - b.childPerformanceScore);
    const safeName = (label || segment?.name || segmentId).replace(/[^a-z0-9]+/gi, '_');
    downloadParentSegmentsExcel(segments, categoryParents, `${safeName}.xlsx`);
    setMessage(`Downloaded ${categoryParents.length} parent(s) — ${segment?.name || segmentId} (lowest child score first).`);
  };

  const handleExport = () => {
    const sorted = [...parents].sort((a, b) => a.childPerformanceScore - b.childPerformanceScore);
    downloadParentSegmentsExcel(segments, sorted);
    setMessage('Exported full segment matrix and all parents to Excel.');
  };

  const handleImport = async (file: File) => {
    setMessage(`Imported ${file.name} — segment assignments are computed automatically from PES; import is for reference only.`);
  };

  const activeSegment = selectedSegment ? segments.find((s) => s.id === selectedSegment) : null;

  if (loading && segments.length === 0) return <ParentLoading label="Computing parent engagement analytics…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Categories"
        title="Parent Categories"
        subtitle="Data-driven segmentation — PES = 35% Attendance + 30% Read Rate + 20% Proactive Messages + 15% Feedback"
        actions={
          <>
            <button type="button" onClick={() => fileRef.current?.click()} className={pm.btnSecondary}>
              <Upload size={14} /> Import
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImport(f); e.target.value = ''; }} />
            <button type="button" onClick={handleExport} className={pm.btnSecondary}>
              <Download size={14} /> Export
            </button>
          </>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

        {segments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            {segments.map((s) => {
              const active = selectedSegment === s.id;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSegment(active ? null : s.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSegment(active ? null : s.id); }}
                  className={`${pm.card} p-4 cursor-pointer transition-all duration-200 border-l-4 ${active ? 'ring-2 ring-offset-1 shadow-md' : 'hover:shadow-md hover:border-slate-300/80'}`}
                  style={{ borderLeftColor: s.color, ...(active ? { ringColor: s.color } : {}) }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{s.name}</h3>
                    <button
                      type="button"
                      title={`Download ${s.name} Excel`}
                      onClick={(e) => { e.stopPropagation(); downloadCategoryExcel(s.id); }}
                      className={`${pm.btnGhost} p-1.5 shrink-0`}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{s.percent}% of parents</p>
                  <p className="text-[10px] text-slate-500 mt-2 leading-snug line-clamp-2">{s.dataProfile}</p>
                  {active && (
                    <p className="text-[10px] font-bold text-indigo-600 mt-2">Showing · lowest child score first</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search parents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${pm.input} pl-9`}
          />
        </div>

        {/* Segmentation matrix — refined borders */}
        <div className="rounded-2xl overflow-hidden border border-emerald-700/30 shadow-[0_8px_30px_rgba(5,150,105,0.12)]">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-3.5 flex items-center gap-2">
            <Users size={18} className="text-white" />
            <h2 className="text-white font-bold text-sm md:text-base tracking-tight">Parent Engagement Segmentation Matrix</h2>
          </div>
          <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-white/95 text-xs md:text-sm font-bold border-b border-white/20">
                  <th className="p-3.5 w-1/5 border-r border-white/15">Category</th>
                  <th className="p-3.5 w-1/4 border-r border-white/15">Data Profile</th>
                  <th className="p-3.5 border-r border-white/15">The Reality</th>
                  <th className="p-3.5 w-24 text-center">Count</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr
                    key={s.id}
                    className={`text-white text-xs md:text-sm border-b border-white/15 cursor-pointer transition-all duration-150 ${selectedSegment === s.id ? 'bg-emerald-900/50 ring-1 ring-inset ring-white/25' : 'hover:bg-emerald-700/60'}`}
                    onClick={() => setSelectedSegment(selectedSegment === s.id ? null : s.id)}
                  >
                    <td className="p-3.5 font-bold border-r border-white/15 align-top">
                      <div className="flex items-center justify-between gap-2">
                        <span>{s.name}</span>
                        <button
                          type="button"
                          title={`Download ${s.name}`}
                          onClick={(e) => { e.stopPropagation(); downloadCategoryExcel(s.id); }}
                          className="p-1 rounded hover:bg-white/20 transition-colors"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 border-r border-white/15 align-top font-medium text-white/95">{s.dataProfile}</td>
                    <td className="p-3.5 border-r border-white/15 align-top leading-relaxed text-white/90">{s.reality}</td>
                    <td className="p-3.5 text-center font-bold align-top tabular-nums">
                      {s.count}
                      <span className="block text-[10px] font-normal opacity-75">{s.percent}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {activeSegment && (
          <div className={`${pm.card} ${pm.cardPad}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Target size={18} className="text-emerald-600" />
                  Engagement Plan: {activeSegment.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1"><span className="font-semibold text-slate-800">Goal:</span> {activeSegment.engagementPlan.goal}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => downloadCategoryExcel(activeSegment.id)}
                  className={`${pm.btnSecondary} text-xs py-1.5`}
                >
                  <Download size={12} /> Excel
                </button>
                <button type="button" onClick={() => setSelectedSegment(null)} className={pm.btnGhost}><X size={18} /></button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-900 uppercase mb-2 flex items-center gap-1"><Lightbulb size={14} /> Platform Actions</p>
                <ul className="text-sm text-amber-950 space-y-1.5 list-disc pl-4">
                  {activeSegment.engagementPlan.platformActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div className="bg-blue-50/80 border border-blue-200/70 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-900 uppercase mb-2">Student Impact</p>
                <p className="text-sm text-blue-950 leading-relaxed">{activeSegment.engagementPlan.studentImpact}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {SEGMENT_ACTIONS[activeSegment.id].map((a) => (
                <button key={a.label} type="button" onClick={() => nav(a.page)} className={pm.btnDark}>
                  {a.label} <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>
        )}

        {(selectedSegment || displayedParents.length > 0) && (
          <ParentTableCard
            title={selectedSegment ? `${activeSegment?.name} — ${displayedParents.length} parent(s)` : `All Segmented Parents (${displayedParents.length})`}
            actions={
              <button
                type="button"
                onClick={() => selectedSegment ? downloadCategoryExcel(selectedSegment) : handleExport()}
                className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
              >
                <Download size={12} /> Download Excel
              </button>
            }
          >
            <table className={pm.table}>
              <thead className={pm.tableHead}>
                <tr>
                  <th className={pm.th}>Parent</th>
                  <th className={pm.th}>Segment</th>
                  <th className={pm.th}>PES</th>
                  <th className={pm.th}>Child Perf. ↓</th>
                  <th className={pm.th}>A / R / M / F</th>
                  <th className={pm.th}>Flags</th>
                </tr>
              </thead>
              <tbody className={pm.tbody}>
                {displayedParents.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 text-sm">No parents in this segment</td></tr>
                ) : displayedParents.map((p) => (
                  <tr key={p.parentKey} className={`${pm.trHover} cursor-pointer`} onClick={() => setSelectedParent(p)}>
                    <td className={pm.td}>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.students.map((s) => s.name).join(', ')}</p>
                    </td>
                    <td className={`${pm.td} text-xs font-bold`}>{p.segmentName}</td>
                    <td className={pm.td}>
                      <span className={`font-bold ${p.pesScore >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>{p.pesScore}</span>
                    </td>
                    <td className={pm.td}>{p.childPerformanceScore}</td>
                    <td className={`${pm.td} text-xs text-slate-500 font-mono`}>
                      {p.pesComponents.attendance}/{p.pesComponents.readRate}/{p.pesComponents.proactiveMessages}/{p.pesComponents.feedback}
                    </td>
                    <td className={`${pm.td} text-xs text-red-600`}>{p.flags.slice(0, 2).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ParentTableCard>
        )}
      </div>

      {selectedParent && (
        <div className={pm.modalOverlay} onClick={() => setSelectedParent(null)} role="presentation">
          <div className={pm.modalLg} onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className={pm.modalTitle}>{selectedParent.name}</h3>
                <p className="text-sm text-slate-500">{selectedParent.segmentName}</p>
              </div>
              <button type="button" onClick={() => setSelectedParent(null)} className={pm.btnGhost}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl"><p className="text-xs text-slate-500">PES Score</p><p className="text-xl font-bold text-slate-900">{selectedParent.pesScore}</p></div>
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl"><p className="text-xs text-slate-500">Child Performance</p><p className="text-xl font-bold text-slate-900">{selectedParent.childPerformanceScore}</p></div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">PES Breakdown</p>
            <div className="space-y-2 mb-4">
              {[
                { label: 'Event Attendance (A)', value: selectedParent.pesComponents.attendance, weight: '35%' },
                { label: 'Read Rate (R)', value: selectedParent.pesComponents.readRate, weight: '30%' },
                { label: 'Proactive Messages (M)', value: selectedParent.pesComponents.proactiveMessages, weight: '20%' },
                { label: 'Feedback (F)', value: selectedParent.pesComponents.feedback, weight: '15%' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>{item.label}</span>
                    <span className="text-slate-500">{item.value} ({item.weight})</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {selectedParent.flags.length > 0 && (
              <ul className="text-xs text-red-600 list-disc pl-4 mb-4">
                {selectedParent.flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {SEGMENT_ACTIONS[selectedParent.segmentId].map((a) => (
                <button key={a.label} type="button" onClick={() => { setSelectedParent(null); nav(a.page); }} className={pm.btnSave}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ParentPageShell>
  );
}
