import React, { useCallback, useEffect, useState } from 'react';
import {
  Trophy,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Filter,
} from 'lucide-react';
import { fetchMeritList, type MeritListEntry } from '../../../lib/meritListServices';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resultBadge(entry: MeritListEntry) {
  if (!entry.submitted) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
        <Clock size={10} /> Pending
      </span>
    );
  }
  if (entry.passed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
        <CheckCircle size={10} /> Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
      <XCircle size={10} /> Failed
    </span>
  );
}

export function MeritListView() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMeritList>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [testId, setTestId] = useState('');
  const [classApplied, setClassApplied] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchMeritList({
        testId: testId || undefined,
        classApplied: classApplied || undefined,
        result: resultFilter,
        q: searchQuery || undefined,
      });
      setData(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load merit list');
    } finally {
      setLoading(false);
    }
  }, [testId, classApplied, resultFilter, searchQuery]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = data?.summary;

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="text-amber-500" size={28} />
          Merit List
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Auto-graded entrance exam results ranked by score. Pass marks default:{' '}
          <span className="font-semibold text-slate-700">{data?.defaultPassMarksPercent ?? 40}%</span>{' '}
          (adjustable under Admission Test settings).
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-100">
          {errorMsg}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Assigned', value: summary.totalAssigned, icon: Users, color: 'text-slate-600' },
            { label: 'Submitted', value: summary.submitted, icon: CheckCircle, color: 'text-indigo-600' },
            { label: 'Pending', value: summary.pending, icon: Clock, color: 'text-amber-600' },
            { label: 'Passed', value: summary.passed, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Failed', value: summary.failed, icon: XCircle, color: 'text-red-600' },
            { label: 'Pass Rate', value: `${summary.passRate}%`, icon: Trophy, color: 'text-amber-600' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <card.icon size={14} className={card.color} />
                {card.label}
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, application ID, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void refresh()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[160px]"
          >
            <option value="">All Tests</option>
            {(data?.tests || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.passMarksPercent}% pass)
              </option>
            ))}
          </select>
          <select
            value={classApplied}
            onChange={(e) => setClassApplied(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[120px]"
          >
            <option value="">All Classes</option>
            {(data?.classes || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="all">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
            <option value="pending">Not Submitted</option>
          </select>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
          >
            <Filter size={14} /> Apply
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading merit list…
          </div>
        ) : !data?.entries.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Trophy size={40} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium">No merit list entries yet</p>
            <p className="text-xs mt-1">Publish a test and assign applicants to see auto-graded results here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3 font-semibold">Rank</th>
                  <th className="text-left p-3 font-semibold">Student</th>
                  <th className="text-left p-3 font-semibold">Application</th>
                  <th className="text-left p-3 font-semibold">Class</th>
                  <th className="text-left p-3 font-semibold">Test</th>
                  <th className="text-left p-3 font-semibold">Score</th>
                  <th className="text-left p-3 font-semibold">Breakdown</th>
                  <th className="text-left p-3 font-semibold">Result</th>
                  <th className="text-left p-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry) => (
                  <tr key={entry.attemptId} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-indigo-700">
                      {entry.rank != null ? `#${entry.rank}` : '—'}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{entry.studentName}</p>
                      <p className="text-[10px] text-slate-400">{entry.email || entry.mobile}</p>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">{entry.applicationId}</td>
                    <td className="p-3 text-slate-600">{entry.classApplied || '—'}</td>
                    <td className="p-3">
                      <p className="text-slate-700 text-xs">{entry.testTitle}</p>
                      <p className="text-[10px] text-slate-400">Pass: {entry.passMarksRequired}%</p>
                    </td>
                    <td className="p-3">
                      {entry.submitted ? (
                        <span className="text-lg font-bold text-slate-800">{entry.scorePercent}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {entry.submitted ? (
                        <span>
                          <span className="text-emerald-600 font-semibold">{entry.correctCount ?? 0}✓</span>
                          {' · '}
                          <span className="text-amber-600">{entry.partialCount ?? 0}½</span>
                          {' · '}
                          <span className="text-red-600">{entry.wrongCount ?? 0}✗</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">{resultBadge(entry)}</td>
                    <td className="p-3 text-xs text-slate-500">{formatDate(entry.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
