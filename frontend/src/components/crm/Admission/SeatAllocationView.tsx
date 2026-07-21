import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Loader2,
  Plus,
  Trash2,
  Save,
  Download,
  Play,
  Search,
  CheckCircle,
  Clock,
  Users,
  LayoutGrid,
  ListOrdered,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  clearSeatAllocations,
  deleteSeatCapacity,
  fetchSeatAllocationMeta,
  fetchSeatAllocations,
  fetchSeatCapacities,
  importSeatCapacitiesFromSetup,
  runSeatAllocation,
  saveSeatCapacities,
  type SeatAllocation,
  type SeatCapacityInput,
} from '../../../lib/seatAllocationServices';

type DraftRow = SeatCapacityInput & { localId: string };

function newDraftRow(partial?: Partial<DraftRow>): DraftRow {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    className: partial?.className || '',
    sectionName: partial?.sectionName || 'A',
    totalSeats: partial?.totalSeats ?? 30,
    sortOrder: partial?.sortOrder ?? 0,
    id: partial?.id,
  };
}

export function SeatAllocationView() {
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [tab, setTab] = useState<'config' | 'results'>('config');
  const [drafts, setDrafts] = useState<DraftRow[]>([newDraftRow()]);
  const [allocations, setAllocations] = useState<SeatAllocation[]>([]);
  const [capacitySummary, setCapacitySummary] = useState({
    totalSeats: 0,
    allocated: 0,
    sections: 0,
    classes: 0,
  });
  const [allocSummary, setAllocSummary] = useState({ total: 0, allocated: 0, waitlisted: 0 });
  const [byClass, setByClass] = useState<
    Array<{
      className: string;
      totalSeats: number;
      allocated: number;
      remaining: number;
    }>
  >([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
  };

  const loadCapacities = useCallback(async (year: string) => {
    const res = await fetchSeatCapacities(year);
    setCapacitySummary(res.summary);
    setByClass(
      res.byClass.map((c) => ({
        className: c.className,
        totalSeats: c.totalSeats,
        allocated: c.allocated,
        remaining: c.remaining,
      })),
    );
    if (res.capacities.length > 0) {
      setDrafts(
        res.capacities.map((c, i) =>
          newDraftRow({
            id: c.id,
            className: c.className,
            sectionName: c.sectionName,
            totalSeats: c.totalSeats,
            sortOrder: c.sortOrder ?? i,
          }),
        ),
      );
    } else {
      setDrafts([newDraftRow()]);
    }
  }, []);

  const loadAllocations = useCallback(async () => {
    const res = await fetchSeatAllocations({
      academicYear,
      className: filterClass || undefined,
      status: filterStatus,
      q: searchQuery || undefined,
    });
    setAllocations(res.allocations);
    setAllocSummary(res.summary);
  }, [academicYear, filterClass, filterStatus, searchQuery]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const meta = await fetchSeatAllocationMeta();
      setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear;
      if (!academicYear) setAcademicYear(year);
      await loadCapacities(year);
      await loadAllocations();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load seat allocation');
    } finally {
      setLoading(false);
    }
  }, [academicYear, loadAllocations, loadCapacities]);

  useEffect(() => {
    void refreshAll();
    // initial load only — year changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!academicYear) return;
    void (async () => {
      setLoading(true);
      try {
        await loadCapacities(academicYear);
        await loadAllocations();
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to reload');
      } finally {
        setLoading(false);
      }
    })();
  }, [academicYear, loadCapacities, loadAllocations]);

  const classOptions = useMemo(() => {
    const fromDrafts = drafts.map((d) => d.className.trim()).filter(Boolean);
    const fromAlloc = allocations.map((a) => a.className).filter(Boolean);
    return [...new Set([...fromDrafts, ...fromAlloc, ...byClass.map((c) => c.className)])].sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [drafts, allocations, byClass]);

  const updateDraft = (localId: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  };

  const handleSaveConfig = async () => {
    const valid = drafts.filter((d) => d.className.trim() && d.sectionName.trim());
    if (valid.length === 0) {
      showError('Add at least one class/section with seats');
      return;
    }
    setSaving(true);
    try {
      const res = await saveSeatCapacities(
        academicYear,
        valid.map((d, i) => ({
          id: d.id,
          className: d.className.trim(),
          sectionName: d.sectionName.trim(),
          totalSeats: Number(d.totalSeats) || 0,
          sortOrder: i,
        })),
      );
      showSuccess(res.message);
      await loadCapacities(academicYear);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save capacities');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    setSaving(true);
    try {
      const res = await importSeatCapacitiesFromSetup(academicYear, drafts.some((d) => d.id));
      showSuccess(res.message);
      await loadCapacities(academicYear);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (row: DraftRow) => {
    if (row.id) {
      if (!confirm(`Delete ${row.className} — ${row.sectionName}?`)) return;
      try {
        await deleteSeatCapacity(row.id);
        showSuccess('Section capacity removed');
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Delete failed');
        return;
      }
    }
    setDrafts((prev) => {
      const next = prev.filter((d) => d.localId !== row.localId);
      return next.length ? next : [newDraftRow()];
    });
    await loadCapacities(academicYear);
  };

  const handleRun = async () => {
    if (
      !confirm(
        'Run auto seat allocation from entrance test merit list?\n\nPassed students will be seated class/section-wise by rank. Remaining candidates are waitlisted.',
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      const res = await runSeatAllocation({ academicYear, clearExisting: true });
      showSuccess(res.message);
      setTab('results');
      await loadCapacities(academicYear);
      await loadAllocations();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Allocation failed');
    } finally {
      setRunning(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all seat allocations for this academic year? Capacities will be kept.')) {
      return;
    }
    try {
      const res = await clearSeatAllocations(academicYear);
      showSuccess(res.message);
      await loadCapacities(academicYear);
      await loadAllocations();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Clear failed');
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Armchair className="text-indigo-600" size={28} />
            Seat Allocation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure seats class &amp; section wise, then auto-allocate from entrance test merit
            ranking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                AY {y}
              </option>
            ))}
            {!years.includes(academicYear) && (
              <option value={academicYear}>AY {academicYear}</option>
            )}
          </select>
          <button
            type="button"
            disabled={running}
            onClick={() => void handleRun()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Auto Allocate from Merit
          </button>
        </div>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            errorMsg
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Seats', value: capacitySummary.totalSeats, icon: LayoutGrid },
          { label: 'Allocated', value: allocSummary.allocated || capacitySummary.allocated, icon: CheckCircle },
          { label: 'Waitlisted', value: allocSummary.waitlisted, icon: Clock },
          { label: 'Sections', value: capacitySummary.sections, icon: Users },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <card.icon size={14} className="text-indigo-500" />
              {card.label}
            </div>
            <p className="text-xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-white p-1 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setTab('config')}
          className={`px-4 py-2 text-sm font-semibold rounded-md ${
            tab === 'config' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Configure Seats
        </button>
        <button
          type="button"
          onClick={() => setTab('results')}
          className={`px-4 py-2 text-sm font-semibold rounded-md ${
            tab === 'results' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Allocation Results
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading…
        </div>
      ) : tab === 'config' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Class &amp; Section Seat Capacities</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set how many admission seats are available per section. Auto-allocation fills
                  sections in order by merit rank.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleImport()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Download size={14} /> Import from Setup
                </button>
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => [...prev, newDraftRow()])}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Plus size={14} /> Add Row
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveConfig()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Configuration
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th className="text-left p-3 font-semibold">Class</th>
                    <th className="text-left p-3 font-semibold">Section</th>
                    <th className="text-left p-3 font-semibold">Total Seats</th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drafts.map((row) => (
                    <tr key={row.localId}>
                      <td className="p-2">
                        <input
                          value={row.className}
                          onChange={(e) => updateDraft(row.localId, { className: e.target.value })}
                          placeholder="e.g. Class 1"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          list="seat-class-suggestions"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={row.sectionName}
                          onChange={(e) => updateDraft(row.localId, { sectionName: e.target.value })}
                          placeholder="A"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={row.totalSeats}
                          onChange={(e) =>
                            updateDraft(row.localId, { totalSeats: Number(e.target.value) || 0 })
                          }
                          className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteRow(row)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="seat-class-suggestions">
                {classOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {byClass.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {byClass.map((c) => (
                <div key={c.className} className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-slate-800">{c.className}</h3>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Seats: {c.totalSeats}</span>
                    <span className="text-emerald-600 font-semibold">Filled: {c.allocated}</span>
                    <span className="text-amber-600 font-semibold">Left: {c.remaining}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${c.totalSeats ? Math.min(100, (c.allocated / c.totalSeats) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void loadAllocations()}
                placeholder="Search student / application / section…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="Allocated">Allocated</option>
              <option value="Waitlisted">Waitlisted</option>
            </select>
            <button
              type="button"
              onClick={() => void loadAllocations()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg"
            >
              <RefreshCw size={14} /> Apply
            </button>
            <button
              type="button"
              onClick={() => void handleClear()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              Clear All
            </button>
          </div>

          {allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ListOrdered size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium">No allocations yet</p>
              <p className="text-xs mt-1 text-center max-w-md">
                Configure class/section seats, ensure students have passed the entrance exam, then
                click <strong>Auto Allocate from Merit</strong>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th className="text-left p-3 font-semibold">Merit #</th>
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-left p-3 font-semibold">Applied</th>
                    <th className="text-left p-3 font-semibold">Score</th>
                    <th className="text-left p-3 font-semibold">Allocated To</th>
                    <th className="text-left p-3 font-semibold">Class Rank</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-indigo-700">#{a.meritRank}</td>
                      <td className="p-3">
                        <p className="font-medium text-slate-800">{a.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{a.applicationId}</p>
                      </td>
                      <td className="p-3 text-slate-600">{a.classApplied || '—'}</td>
                      <td className="p-3 font-semibold text-slate-800">{a.entranceScore}%</td>
                      <td className="p-3">
                        {a.statusKey === 'ALLOCATED' ? (
                          <span className="font-medium text-slate-800">
                            {a.className} — {a.sectionName}
                          </span>
                        ) : (
                          <span className="text-slate-400">{a.className || a.classApplied}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {a.classMeritRank > 0 ? `#${a.classMeritRank}` : '—'}
                      </td>
                      <td className="p-3">
                        {a.statusKey === 'ALLOCATED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            <CheckCircle size={10} /> Allocated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            <Clock size={10} /> Waitlisted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
