import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart2, RefreshCw, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { fetchEventInvitationsManagement, type EventInvitationsManagement } from '../../../lib/communicationServices';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

export function EventReportsView() {
  const [data, setData] = useState<EventInvitationsManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEventInvitationsManagement(false, academicYear, 'Super Admin'));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const byType = useMemo(() => {
    const map = new Map<string, { count: number; attending: number }>();
    for (const e of data?.events ?? []) {
      const key = e.eventTypeLabel;
      const cur = map.get(key) ?? { count: 0, attending: 0 };
      cur.count += 1;
      cur.attending += e.rsvpYesCount;
      map.set(key, cur);
    }
    return [...map.entries()].map(([name, v]) => ({ name, events: v.count, attending: v.attending }));
  }, [data]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of data?.events ?? []) {
      map.set(e.status, (map.get(e.status) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [data]);

  const exportSummary = () => {
    const rows = [
      ['Event', 'Type', 'Date', 'Status', 'Invited', 'Attending', 'RSVP %'],
      ...(data?.events ?? []).map((e) => [
        e.title,
        e.eventTypeLabel,
        new Date(e.eventDate).toLocaleDateString('en-IN'),
        e.status,
        String(e.inviteCount),
        String(e.rsvpYesCount),
        String(e.rsvpResponseRate),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-reports-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) return <AcademicLoading label="Loading event reports…" />;

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart2 size={20} className="text-indigo-600" />
            Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Event performance, RSVP rates and attendance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={exportSummary} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          { label: 'Total Events', value: kpis?.totalEvents ?? 0 },
          { label: 'Published', value: kpis?.published ?? 0 },
          { label: 'Upcoming', value: kpis?.upcoming ?? 0 },
          { label: 'Drafts', value: kpis?.drafts ?? 0 },
          { label: 'Invited', value: kpis?.totalInvited ?? 0 },
          { label: 'Attending', value: kpis?.totalYes ?? 0 },
          { label: 'Avg RSVP', value: `${kpis?.avgRsvpRate ?? 0}%` },
          { label: 'Pending', value: kpis?.pendingRsvps ?? 0 },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border p-2 text-center">
            <div className="text-sm font-bold text-slate-800">{k.value}</div>
            <div className="text-[9px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 mb-3">Events by Type</h3>
          {byType.length === 0 ? (
            <p className="text-xs text-slate-500">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Bar dataKey="events" name="Events" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attending" name="Attending" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 mb-3">Events by Status</h3>
          {byStatus.length === 0 ? (
            <p className="text-xs text-slate-500">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Bar dataKey="value" name="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b text-xs font-bold text-slate-700">Event Performance Table</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Event</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Type</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Date</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                <th className="text-right px-3 py-2 font-bold text-slate-600">Invited</th>
                <th className="text-right px-3 py-2 font-bold text-slate-600">Attending</th>
                <th className="text-right px-3 py-2 font-bold text-slate-600">RSVP %</th>
              </tr>
            </thead>
            <tbody>
              {(data?.events ?? []).map((e) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{e.title}</td>
                  <td className="px-3 py-2 text-slate-600">{e.eventTypeLabel}</td>
                  <td className="px-3 py-2 text-slate-600">{new Date(e.eventDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">{e.status}</span></td>
                  <td className="px-3 py-2 text-right">{e.inviteCount}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-bold">{e.rsvpYesCount}</td>
                  <td className="px-3 py-2 text-right">{e.status === 'PUBLISHED' ? `${e.rsvpResponseRate}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data?.complianceNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-900">
          <p className="font-bold mb-1">Compliance Notes</p>
          <ul className="list-disc list-inside space-y-0.5">
            {data.complianceNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
