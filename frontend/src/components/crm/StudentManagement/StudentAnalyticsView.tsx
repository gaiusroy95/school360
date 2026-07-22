import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Search, Filter, Loader2, X, Eye, RefreshCw, Info, AlertTriangle, Download, Star, TrendingDown,
} from 'lucide-react';
import {
  STUDENT_ANALYTICS_STATUSES,
  fetchStudentAnalyticsMeta,
  fetchStudentAnalyticsRecord,
  fetchStudentAnalyticsRecords,
  refreshStudentAnalyticsRecord,
  syncStudentAnalytics,
  type ScoreLabel,
  type StudentAnalyticsRecord,
  type StudentAnalyticsSummary,
  type StudentScores,
} from '../../../lib/studentAnalyticsRecordServices';
import { fetchStudentsMeta } from '../../../lib/studentServices';
import {
  downloadStudentAnalyticsListExcel,
  downloadStudentAnalyticsRecordExcel,
  downloadRedCategoryExcel,
  downloadExceptionalExcel,
} from '../../../lib/studentAnalyticsExcel';
import {
  categorizeStudentAnalytics,
  lowestAreaScore,
  AREA_SCORE_LABELS,
} from '../../../lib/studentAnalyticsCategories';

function scoreColor(score: number, invert = false) {
  const v = invert ? 100 - score : score;
  if (v >= 80) return 'text-emerald-600';
  if (v >= 65) return 'text-blue-600';
  if (v >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBarColor(score: number, invert = false) {
  const v = invert ? 100 - score : score;
  if (v >= 80) return 'bg-emerald-500';
  if (v >= 65) return 'bg-blue-500';
  if (v >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function StudentAnalyticsView() {
  const [summary, setSummary] = useState<StudentAnalyticsSummary | null>(null);
  const [aggregates, setAggregates] = useState<(StudentScores & { studentCount: number }) | null>(null);
  const [scoreLabels, setScoreLabels] = useState<ScoreLabel[]>([]);
  const [records, setRecords] = useState<StudentAnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [filterSectionOptions, setFilterSectionOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [viewRecord, setViewRecord] = useState<{
    record: StudentAnalyticsRecord;
    student: {
      admissionNumber: string;
      rollNumber: string;
      mobile: string;
      fatherName: string;
      motherName: string;
      status: string;
      entranceScore: number | null;
    };
  } | null>(null);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const year = filterYear || undefined;
      const [meta, list] = await Promise.all([
        fetchStudentAnalyticsMeta(year),
        fetchStudentAnalyticsRecords({
          q: search || undefined,
          status: filterStatus || undefined,
          className: filterClass || undefined,
          sectionName: filterSection || undefined,
          academicYear: year,
        }),
      ]);
      setSummary(meta.summary);
      setAggregates(meta.aggregates);
      setScoreLabels(meta.scoreLabels);
      setRecords(list.records);
      setFilterYear((y) => y || meta.defaultAcademicYear);

      if (meta.summary.total === 0) {
        await syncStudentAnalytics({ academicYear: meta.defaultAcademicYear });
        const [meta2, list2] = await Promise.all([
          fetchStudentAnalyticsMeta(meta.defaultAcademicYear),
          fetchStudentAnalyticsRecords({ academicYear: meta.defaultAcademicYear }),
        ]);
        setSummary(meta2.summary);
        setAggregates(meta2.aggregates);
        setRecords(list2.records);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterClass, filterSection, filterYear]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setClassOptions(m.filters.classes);
      setYearOptions(m.filters.academicYears);
    });
  }, []);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setFilterSectionOptions(filterClass ? m.filters.sectionsByClass[filterClass] || [] : []);
    });
  }, [filterClass]);

  const openView = async (record: StudentAnalyticsRecord) => {
    const detail = await fetchStudentAnalyticsRecord(record.id);
    setViewRecord(detail);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const res = await syncStudentAnalytics({
        academicYear: filterYear || undefined,
        className: filterClass || undefined,
        sectionName: filterSection || undefined,
      });
      setMessage(`Synced ${res.total} student(s): ${res.created} created, ${res.updated} updated.`);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const { redCategory, exceptional } = useMemo(
    () => categorizeStudentAnalytics(records),
    [records],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Student Management &gt; Student Analytics</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Student Analytics</h1>
            <p className="text-xs text-slate-500 mt-1">Holistic student scores — growth, performance, attendance &amp; AI risk</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              disabled={records.length === 0}
              onClick={() => downloadStudentAnalyticsListExcel(records)}
              className="px-3 py-2 border border-emerald-600 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Download size={14} />
              Download Excel
              {records.length > 0 ? ` (${records.length.toLocaleString('en-IN')})` : ''}
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleSync()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Scores
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Student Analytics', value: summary.total },
              { label: 'Active / Open', value: summary.activeOpen },
              { label: 'Pending', value: summary.pending },
              { label: 'This Month', value: summary.thisMonth },
            ].map((k) => (
              <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800">{k.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        {aggregates && scoreLabels.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-800">Institution-wide score averages</p>
                <p className="text-[10px] text-blue-600">
                  Based on {aggregates.studentCount} student{aggregates.studentCount !== 1 ? 's' : ''}
                  {filterYear ? ` · ${filterYear}` : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {scoreLabels.map(({ key, label }) => {
                const val = aggregates[key] ?? 0;
                const invert = key === 'aiRiskScore';
                return (
                  <div key={key} className="bg-white border border-blue-100 rounded-lg p-2.5">
                    <p className="text-[9px] font-bold text-slate-500 leading-tight mb-1">{label}</p>
                    <p className={`text-lg font-bold ${scoreColor(val, invert)}`}>{val}</p>
                    <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full ${scoreBarColor(val, invert)}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student analytics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border">
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Sections</option>
              {filterSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Years</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Statuses</option>
              {STUDENT_ANALYTICS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => { setFilterClass(''); setFilterSection(''); setFilterStatus(''); setFilterYear(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear</button>
          </div>
        )}
        {message && <p className="text-xs text-indigo-600 mt-2">{message}</p>}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : records.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm shadow-sm">
            No analytics records yet. Click <strong>Sync Scores</strong> to compute scores from live student data.
          </div>
        ) : (
          <>
            <CategoryReportSection
              variant="red"
              title="Red Category Students"
              description="Growth score below 55%, attendance below 80%, and every other area score below 80%."
              icon={<TrendingDown size={16} />}
              records={redCategory}
              onView={(r) => void openView(r)}
              onDownloadExcel={() => downloadRedCategoryExcel(redCategory)}
            />
            <CategoryReportSection
              variant="exceptional"
              title="Exceptional Performance Students"
              description="Highest holistic achievers — growth score and every area score at 80% or above."
              icon={<Star size={16} />}
              records={exceptional}
              onView={(r) => void openView(r)}
              onDownloadExcel={() => downloadExceptionalExcel(exceptional)}
              showRank
            />
          </>
        )}
      </div>

      {viewRecord && (
        <ViewAnalyticsModal
          record={viewRecord.record}
          student={viewRecord.student}
          scoreLabels={scoreLabels}
          onClose={() => setViewRecord(null)}
          onRefresh={async () => {
            const res = await refreshStudentAnalyticsRecord(viewRecord.record.id);
            setViewRecord(res);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CategoryReportSection({
  variant,
  title,
  description,
  icon,
  records,
  onView,
  onDownloadExcel,
  showRank = false,
}: {
  variant: 'red' | 'exceptional';
  title: string;
  description: string;
  icon: ReactNode;
  records: StudentAnalyticsRecord[];
  onView: (record: StudentAnalyticsRecord) => void;
  onDownloadExcel: () => void;
  showRank?: boolean;
}) {
  const isRed = variant === 'red';
  const headerBg = isRed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const headerText = isRed ? 'text-red-800' : 'text-amber-900';
  const headerSub = isRed ? 'text-red-600' : 'text-amber-700';
  const badgeBg = isRed ? 'bg-red-600' : 'bg-amber-500';

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm ${isRed ? 'border-red-200' : 'border-amber-200'}`}>
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${headerBg}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 ${headerText}`}>{icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-sm font-bold ${headerText}`}>{title}</h2>
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badgeBg}`}>
                {records.length.toLocaleString('en-IN')} student{records.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${headerSub}`}>{description}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={records.length === 0}
          onClick={onDownloadExcel}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-50 ${
            isRed
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          <Download size={13} />
          Download Excel
          {records.length > 0 ? ` (${records.length})` : ''}
        </button>
      </div>

      {records.length === 0 ? (
        <p className="p-8 text-center text-slate-500 text-sm">
          {isRed
            ? 'No students currently match the red category criteria.'
            : 'No students currently qualify as exceptional performers.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                {showRank && <th className="p-3 text-left text-xs font-bold text-slate-500 w-14">Rank</th>}
                <th className="p-3 text-left text-xs font-bold text-slate-500">Report ID</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500">Student</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500">Growth</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 hidden lg:table-cell">Academic</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 hidden lg:table-cell">Attendance</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 hidden xl:table-cell">Behaviour</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 hidden xl:table-cell">Discipline</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500">AI Risk</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500">
                  {isRed ? 'Weakest Area' : 'Avg Area'}
                </th>
                <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, index) => {
                const weakest = lowestAreaScore(r.scores);
                const areaAvg = Math.round(
                  (r.scores.academicPerformance +
                    r.scores.attendanceScore +
                    r.scores.behaviourScore +
                    r.scores.disciplineScore +
                    r.scores.healthScore +
                    r.scores.physicalFitnessScore +
                    r.scores.skillDevelopmentScore +
                    r.scores.parentEngagementScore +
                    r.scores.teacherFeedbackScore) / 9,
                );
                return (
                  <tr key={r.id} className={`border-t hover:bg-slate-50 ${isRed ? 'bg-red-50/30' : 'bg-amber-50/20'}`}>
                    {showRank && (
                      <td className="p-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-300 text-slate-700' : index === 2 ? 'bg-amber-700/80 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                    )}
                    <td className="p-3 font-mono text-xs text-slate-600">{r.recordId}</td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.classGroup}</p>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${scoreColor(r.scores.growthScore)}`}>{r.scores.growthScore}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className={`font-bold ${scoreColor(r.scores.academicPerformance)}`}>{r.scores.academicPerformance}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className={`font-bold ${scoreColor(r.scores.attendanceScore)}`}>{r.scores.attendanceScore}</span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <span className={`font-bold ${scoreColor(r.scores.behaviourScore)}`}>{r.scores.behaviourScore}</span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <span className={`font-bold ${scoreColor(r.scores.disciplineScore)}`}>{r.scores.disciplineScore}</span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${scoreColor(r.scores.aiRiskScore, true)}`}>{r.scores.aiRiskScore}</span>
                    </td>
                    <td className="p-3 text-xs">
                      {isRed ? (
                        <span className="text-red-700 font-medium">
                          {AREA_SCORE_LABELS[weakest.key]} ({weakest.value})
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">{areaAvg}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => onView(r)} className="text-indigo-600 text-xs font-bold hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ViewAnalyticsModal({
  record,
  student,
  scoreLabels,
  onClose,
  onRefresh,
}: {
  record: StudentAnalyticsRecord;
  student: {
    admissionNumber: string;
    rollNumber: string;
    mobile: string;
    fatherName: string;
    motherName: string;
    status: string;
    entranceScore: number | null;
  };
  scoreLabels: ScoreLabel[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const scores = record.scores;
  const flags = record.riskFlags;

  const runRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const riskItems = [
    { label: 'Dropout Risk', active: flags.dropoutRisk },
    { label: 'Low Performance', active: flags.lowPerformanceRisk },
    { label: 'Fee Default', active: flags.feeDefaultRisk },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-800">{record.recordId} — {record.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {record.classGroup} · {record.academicYear} · Adm. {student.admissionNumber}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Computed {new Date(record.computedAt).toLocaleString('en-IN')}
            </p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-indigo-600 uppercase">Growth Score</p>
              <p className={`text-3xl font-bold ${scoreColor(scores.growthScore)}`}>{scores.growthScore}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-red-600 uppercase flex items-center justify-center gap-1">
                <AlertTriangle size={12} /> AI Risk Score
              </p>
              <p className={`text-3xl font-bold ${scoreColor(scores.aiRiskScore, true)}`}>{scores.aiRiskScore}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {riskItems.map((r) => (
              <span
                key={r.label}
                className={`text-[10px] font-bold px-2 py-1 rounded border ${
                  r.active ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {r.label}: {r.active ? 'Flagged' : 'Clear'}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(scoreLabels.length > 0 ? scoreLabels : [
              { key: 'academicPerformance' as const, label: 'Academic Performance Index' },
              { key: 'attendanceScore' as const, label: 'Attendance Score' },
              { key: 'behaviourScore' as const, label: 'Behaviour Score' },
              { key: 'disciplineScore' as const, label: 'Discipline Score' },
              { key: 'healthScore' as const, label: 'Health Score' },
              { key: 'physicalFitnessScore' as const, label: 'Physical Fitness Score' },
              { key: 'skillDevelopmentScore' as const, label: 'Skill Development Score' },
              { key: 'parentEngagementScore' as const, label: 'Parent Engagement Score' },
              { key: 'teacherFeedbackScore' as const, label: 'Teacher Feedback Score' },
            ])
              .filter(({ key }) => key !== 'growthScore' && key !== 'aiRiskScore')
              .map(({ key, label }) => {
                const val = scores[key] ?? 0;
                return (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-600">{label}</p>
                      <span className={`text-sm font-bold ${scoreColor(val)}`}>{val}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${scoreBarColor(val)}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="bg-slate-50 border rounded-lg p-3 text-xs text-slate-600 grid grid-cols-2 gap-2">
            <span>Roll No: <strong>{student.rollNumber || '—'}</strong></span>
            <span>Status: <strong>{student.status}</strong></span>
            <span>Entrance: <strong>{student.entranceScore != null ? `${student.entranceScore}%` : '—'}</strong></span>
            <span>Mobile: <strong>{student.mobile || '—'}</strong></span>
            <span>Father: <strong>{student.fatherName || '—'}</strong></span>
            <span>Mother: <strong>{student.motherName || '—'}</strong></span>
          </div>
        </div>

        <div className="p-4 border-t flex flex-wrap justify-between gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void runRefresh()}
            className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh Scores
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadStudentAnalyticsRecordExcel(record, student)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-700"
            >
              <Download size={14} /> Download Excel
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1">
              <Eye size={14} /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
