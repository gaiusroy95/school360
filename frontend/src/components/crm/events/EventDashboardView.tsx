import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Calendar, Clock, CalendarCheck, Users, Plus, RefreshCw,
  ChevronRight, Bell, BarChart2, Mail, CheckCircle2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
} from 'recharts';
import { fetchEventInvitationsManagement, type EventInvitationsManagement } from '../../../lib/communicationServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const TYPE_COLORS: Record<string, string> = {
  ANNUAL_DAY: '#3b82f6',
  SPORTS_MEET: '#10b981',
  PTM: '#8b5cf6',
  WORKSHOP: '#f59e0b',
  OTHER: '#64748b',
};

function eventStatus(event: EventInvitationsManagement['events'][0], now: Date) {
  const d = new Date(event.eventDate);
  if (event.status === 'CANCELLED') return 'Cancelled';
  if (event.status === 'COMPLETED') return 'Completed';
  if (event.status === 'DRAFT') return 'Draft';
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dayStart.getTime() === today.getTime() && event.status === 'PUBLISHED') return 'Ongoing';
  if (d >= now && event.status === 'PUBLISHED') return 'Upcoming';
  if (d < now && event.status === 'PUBLISHED') return 'Completed';
  return event.status;
}

export function EventDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<EventInvitationsManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchEventInvitationsManagement(seed, academicYear, 'Super Admin'));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const nav = (sub: string) => onNavigate?.(toViewKey('Event Management', sub));

  const now = new Date();
  const events = data?.events ?? [];

  const statusCounts = useMemo(() => {
    const counts = { Upcoming: 0, Ongoing: 0, Completed: 0, Cancelled: 0, Draft: 0 };
    for (const e of events) {
      const s = eventStatus(e, now);
      if (s in counts) counts[s as keyof typeof counts] += 1;
    }
    return counts;
  }, [events, now]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const label = e.eventTypeLabel || e.eventType;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const total = events.length || 1;
    return [...map.entries()].map(([name, value]) => ({
      name,
      value,
      color: TYPE_COLORS[events.find((ev) => ev.eventTypeLabel === name)?.eventType ?? ''] ?? '#64748b',
      percent: `${Math.round((value / total) * 1000) / 10}%`,
    }));
  }, [events]);

  const upcomingEvents = useMemo(
    () => events
      .filter((e) => eventStatus(e, now) === 'Upcoming')
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5),
    [events, now],
  );

  const recentEvents = useMemo(
    () => [...events]
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 6),
    [events],
  );

  const registrationTrend = useMemo(() => {
    const byMonth = new Map<string, { total: number; confirmed: number }>();
    for (const e of events.filter((ev) => ev.status === 'PUBLISHED' || ev.status === 'COMPLETED')) {
      const key = new Date(e.eventDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const cur = byMonth.get(key) ?? { total: 0, confirmed: 0 };
      cur.total += e.inviteCount;
      cur.confirmed += e.rsvpYesCount;
      byMonth.set(key, cur);
    }
    return [...byMonth.entries()].slice(-7).map(([day, v]) => ({ day, total: v.total, confirmed: v.confirmed }));
  }, [events]);

  const topByRegistrations = useMemo(
    () => [...events]
      .filter((e) => e.inviteCount > 0)
      .sort((a, b) => b.rsvpYesCount - a.rsvpYesCount)
      .slice(0, 5),
    [events],
  );

  const reminders = upcomingEvents.slice(0, 4).map((e) => ({
    title: e.title,
    desc: e.rsvpDeadline
      ? `RSVP deadline: ${new Date(e.rsvpDeadline).toLocaleDateString('en-IN')}`
      : `${e.rsvpPendingCount} pending RSVP(s)`,
    date: new Date(e.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  }));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading && !data) return <AcademicLoading label="Loading event dashboard…" />;

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Event Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan • Organize • Engage • Celebrate</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => nav('Create Event')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm"
          >
            <Plus size={14} />
            Create New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { title: 'Total Events', value: kpis?.totalEvents ?? 0, subtitle: `${kpis?.drafts ?? 0} drafts`, color: 'bg-blue-500', icon: <CalendarDays size={20} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
          { title: 'Upcoming', value: statusCounts.Upcoming, subtitle: 'Published & scheduled', color: 'bg-green-500', icon: <Calendar size={20} />, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
          { title: 'Ongoing', value: statusCounts.Ongoing, subtitle: 'Today', color: 'bg-purple-500', icon: <Clock size={20} />, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
          { title: 'Completed', value: statusCounts.Completed, subtitle: 'Past events', color: 'bg-blue-500', icon: <CalendarCheck size={20} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
          { title: 'Registrations', value: kpis?.totalYes ?? 0, subtitle: `${kpis?.totalInvited ?? 0} invited`, color: 'bg-orange-500', icon: <Users size={20} />, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
          { title: 'RSVP Rate', value: `${kpis?.avgRsvpRate ?? 0}%`, subtitle: `${kpis?.pendingRsvps ?? 0} pending`, color: 'bg-green-500', icon: <CheckCircle2 size={20} />, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
        ].map((kpi) => (
          <div key={kpi.title} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[14px] font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
            </div>
            <p className="text-[8px] text-slate-500">{kpi.subtitle}</p>
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Events by Type</h3>
            <button type="button" onClick={() => nav('Reports & Analytics')} className="text-[9px] text-blue-600 font-medium hover:underline">View Report</button>
          </div>
          {typeBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No events yet. Create your first event.</p>
          ) : (
            <div className="flex items-center justify-center gap-4 flex-1">
              <div className="w-24 h-24 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                      {typeBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[14px] font-bold text-slate-800">{events.length}</span>
                  <span className="text-[6px] text-slate-500">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-[9px] flex-1">
                {typeBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 text-[8px] font-medium truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[8px]">{item.value} ({item.percent})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col min-h-[180px]">
          <h3 className="text-[11px] font-bold text-slate-800 mb-2">Registration Trends</h3>
          {registrationTrend.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Publish events to see RSVP trends.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={registrationTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} />
                <RechartsTooltip contentStyle={{ fontSize: '9px' }} />
                <Legend wrapperStyle={{ fontSize: '8px' }} />
                <Line type="monotone" dataKey="total" name="Invited" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="confirmed" name="Attending" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Upcoming Events</h3>
            <button type="button" onClick={() => nav('Events List')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-[10px] text-slate-500">No upcoming events scheduled.</p>
            ) : upcomingEvents.map((e) => (
              <div key={e.id} className="border-b border-slate-50 pb-2 last:border-0">
                <p className="text-[9px] font-bold text-slate-800 truncate">{e.title}</p>
                <p className="text-[7.5px] text-slate-500">{formatDate(e.eventDate)}{e.eventTime ? ` • ${e.eventTime}` : ''}</p>
                <p className="text-[7.5px] text-slate-500 truncate">{e.venue || 'Venue TBD'}</p>
                <span className="text-[7px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                  {e.rsvpYesCount} attending
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Events</h3>
            <button type="button" onClick={() => nav('Events List')} className="text-[9px] text-blue-600">View All</button>
          </div>
          <table className="w-full text-[8px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="pb-2 text-left font-medium">Event</th>
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-center font-medium">RSVP</th>
                <th className="pb-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentEvents.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-2 font-bold text-slate-800 truncate max-w-[120px]">{e.title}</td>
                  <td className="py-2 text-slate-600">{formatDate(e.eventDate)}</td>
                  <td className="py-2 text-center text-blue-600 font-bold">{e.rsvpYesCount}/{e.inviteCount}</td>
                  <td className="py-2 text-right">
                    <span className="text-[7px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">{eventStatus(e, now)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Create Event', icon: <CalendarDays size={16} className="text-blue-600" />, target: 'Create Event' },
              { label: 'Registrations', icon: <Users size={16} className="text-purple-600" />, target: 'Registrations' },
              { label: 'Send Invitation', icon: <Mail size={16} className="text-blue-600" />, target: 'Events List' },
              { label: 'Event Calendar', icon: <Calendar size={16} className="text-green-600" />, target: 'Event Calendar' },
              { label: 'Feedback', icon: <BarChart2 size={16} className="text-purple-600" />, target: 'Feedback & Surveys' },
              { label: 'Auto Remind', icon: <Bell size={16} className="text-amber-600" />, target: 'Events List' },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => nav(a.target)}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-center"
              >
                {a.icon}
                <span className="text-[7.5px] text-slate-700 font-medium mt-1">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Status Summary</h3>
          {Object.entries(statusCounts).filter(([, c]) => c > 0).map(([label, count]) => (
            <div key={label} className="mb-2">
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold">{count}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: events.length ? `${(count / events.length) * 100}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Reminders</h3>
          {reminders.length === 0 ? (
            <p className="text-[10px] text-slate-500">No upcoming reminders.</p>
          ) : reminders.map((r) => (
            <div key={r.title} className="mb-2 pb-2 border-b border-slate-50 last:border-0">
              <p className="text-[9px] font-bold text-slate-800 truncate">{r.title}</p>
              <p className="text-[7.5px] text-slate-500">{r.desc}</p>
              <p className="text-[7px] text-slate-400 mt-0.5">{r.date}</p>
            </div>
          ))}
        </div>
      </div>

      {topByRegistrations.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top Events by Attendance</h3>
            <button type="button" onClick={() => nav('Registrations')} className="text-[9px] text-blue-600 flex items-center gap-0.5">
              Manage <ChevronRight size={10} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {topByRegistrations.map((e, i) => (
              <div key={e.id} className="text-[9px] p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-400 font-bold">{i + 1}.</span>{' '}
                <span className="font-medium text-slate-800">{e.title}</span>
                <p className="text-blue-600 font-bold mt-1">{e.rsvpYesCount} attending</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
