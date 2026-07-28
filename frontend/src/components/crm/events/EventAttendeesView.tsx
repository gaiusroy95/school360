import { useCallback, useEffect, useState } from 'react';
import { Users, Ticket, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import {
  fetchEventInvitationsManagement,
  fetchEventInvitationDetail,
  type EventInvitationsManagement,
  type EventInvitationDetail,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export function EventAttendeesView({ mode = 'registrations' }: { mode?: 'registrations' | 'tickets' }) {
  const [data, setData] = useState<EventInvitationsManagement | null>(null);
  const [detail, setDetail] = useState<EventInvitationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');

  const isTickets = mode === 'tickets';
  const title = isTickets ? 'Tickets & Passes' : 'Registrations';
  const subtitle = isTickets
    ? 'Confirmed attendees and guest passes for published events'
    : 'RSVP responses, guest counts and pending invitees';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEventInvitationsManagement(false, academicYear, 'Super Admin'));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await fetchEventInvitationDetail(id);
      setDetail(result);
      setSelectedId(id);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const publishedEvents = (data?.events ?? []).filter((e) => e.status === 'PUBLISHED' || e.status === 'COMPLETED');

  const exportCsv = () => {
    if (!detail) return;
    const rows = [
      ['Name', 'Role', 'Response', 'Guests', 'Responded At'],
      ...detail.rsvps.yes.map((r) => [r.accountName, r.accountRole, r.response, String(r.guestCount), r.respondedAt ?? '']),
      ...detail.rsvps.maybe.map((r) => [r.accountName, r.accountRole, r.response, String(r.guestCount), r.respondedAt ?? '']),
      ...detail.rsvps.pending.map((r) => [r.accountName, r.accountRole, r.response, '0', '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detail.event.title.replace(/\s+/g, '-')}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Attendee list exported.');
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading && !data) return <AcademicLoading label={`Loading ${title.toLowerCase()}…`} />;

  const attendees = detail
    ? (isTickets ? detail.rsvps.yes : [...detail.rsvps.yes, ...detail.rsvps.maybe, ...detail.rsvps.no, ...detail.rsvps.pending])
    : [];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {isTickets ? <Ticket size={20} className="text-indigo-600" /> : <Users size={20} className="text-indigo-600" />}
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          {detail && (
            <button type="button" onClick={exportCsv} className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type="success" />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Published Events', value: publishedEvents.length },
          { label: 'Total Invited', value: data?.kpis.totalInvited ?? 0 },
          { label: 'Attending', value: data?.kpis.totalYes ?? 0 },
          { label: 'Pending RSVP', value: data?.kpis.pendingRsvps ?? 0 },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border p-2 text-center">
            <div className="text-lg font-bold text-slate-800">{k.value}</div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b text-xs font-bold text-slate-700">Select Event</div>
          <div className="max-h-[420px] overflow-y-auto">
            {publishedEvents.length === 0 ? (
              <p className="text-xs text-slate-500 p-4">No published events. Publish an event from Events List first.</p>
            ) : publishedEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => void loadDetail(e.id)}
                className={`w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-indigo-50/40 ${selectedId === e.id ? 'bg-indigo-50' : ''}`}
              >
                <p className="text-xs font-semibold text-slate-800">{e.title}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(e.eventDate).toLocaleDateString('en-IN')} • {e.rsvpYesCount} attending
                  {isTickets && ` • ${e.rsvpYesCount + e.rsvpMaybeCount} passes`}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
              Select a published event to view {isTickets ? 'passes' : 'registrations'}.
            </div>
          ) : detailLoading ? (
            <AcademicLoading label="Loading attendees…" />
          ) : detail ? (
            <>
              <div className="px-4 py-3 border-b flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{detail.event.title}</h3>
                  <p className="text-[10px] text-slate-500">
                    Expected attendance: <strong>{detail.summary.expectedAttendance}</strong>
                    {' • '}Guests: <strong>{detail.summary.totalGuests}</strong>
                    {' • '}RSVP rate: <strong>{detail.summary.rsvpResponseRate}%</strong>
                  </p>
                </div>
                {isTickets && (
                  <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 flex items-center gap-1">
                    <CheckCircle2 size={10} /> {detail.rsvps.yes.length} valid passes
                  </span>
                )}
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-bold text-slate-600">Name</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600">Role</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600">Response</th>
                      {!isTickets && <th className="text-center px-3 py-2 font-bold text-slate-600">Guests</th>}
                      <th className="text-right px-3 py-2 font-bold text-slate-600">Responded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{r.accountName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.accountRole}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.response === 'YES' ? 'bg-green-100 text-green-800'
                              : r.response === 'NO' ? 'bg-red-100 text-red-700'
                                : r.response === 'MAYBE' ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                          }`}>
                            {r.response}
                          </span>
                        </td>
                        {!isTickets && (
                          <td className="px-3 py-2 text-center">
                            {'guestCount' in r ? Number(r.guestCount) || 0 : 0}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right text-slate-500 text-[10px]">
                          {'respondedAt' in r && r.respondedAt
                            ? new Date(r.respondedAt).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
