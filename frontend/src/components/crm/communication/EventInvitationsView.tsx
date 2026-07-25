import { useCallback, useEffect, useState } from 'react';
import {
  Calendar, RefreshCw, Plus, Send, Users, CheckCircle2, XCircle,
  HelpCircle, Clock, Bell, MapPin, X, PartyPopper,
} from 'lucide-react';
import {
  fetchEventInvitationsManagement,
  fetchEventInvitationDetail,
  createEventDraft,
  publishEventInvitation,
  resendEventReminders,
  processAutoEventReminders,
  type EventInvitationsManagement,
  type EventInvitationDetail,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager'];
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  YES: 'bg-green-100 text-green-800',
  NO: 'bg-red-100 text-red-700',
  MAYBE: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-slate-100 text-slate-600',
};

const EVENT_TYPE_ICON: Record<string, string> = {
  ANNUAL_DAY: '🎭',
  SPORTS_MEET: '🏆',
  PTM: '👨‍👩‍👧',
  WORKSHOP: '📚',
  OTHER: '📅',
};

export function EventInvitationsView() {
  const [data, setData] = useState<EventInvitationsManagement | null>(null);
  const [detail, setDetail] = useState<EventInvitationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('PTM');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [audienceType, setAudienceType] = useState('PARENT');
  const [classFilter, setClassFilter] = useState('');
  const [allowGuests, setAllowGuests] = useState(false);
  const [remindDaysBefore, setRemindDaysBefore] = useState(3);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchEventInvitationsManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await fetchEventInvitationDetail(id);
      setDetail(result);
      setSelectedId(id);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canManage = data?.permissions.canManage ?? false;
  const canPublish = data?.permissions.canPublish ?? false;

  const handleCreate = async () => {
    if (!title.trim() || !eventDate) { flash('Title and event date are required.', 'error'); return; }
    setSaving(true);
    try {
      const result = await createEventDraft({
        title, description, eventType, venue, eventDate, eventTime,
        rsvpDeadline: rsvpDeadline || undefined, audienceType, classFilter,
        allowGuests, remindDaysBefore, autoRemindEnabled: true,
        academicYear, userRole,
      });
      setData(result.data);
      setShowCompose(false);
      setTitle(''); setDescription(''); setVenue('');
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const result = await publishEventInvitation(id, { userRole, sendPush: true });
      setData(result.data);
      if (selectedId === id) await loadDetail(id);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  };

  const handleResendReminders = async (id: string) => {
    try {
      const result = await resendEventReminders(id, userRole);
      setData(result.data);
      setDetail(result.detail);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reminder failed', 'error');
    }
  };

  const handleAutoReminders = async () => {
    try {
      const result = await processAutoEventReminders();
      setData(result.data);
      flash(`Auto-reminders processed: ${result.reminded} reminder(s) sent.`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Auto-reminder failed', 'error');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading && !data) return <AcademicLoading label="Loading event invitations…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Event Invitations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage RSVPs &amp; automated reminders for Annual Day, Sports Meet, PTMs &amp; more</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          {canManage && (
            <>
              <button type="button" onClick={() => void handleAutoReminders()}
                className="flex items-center gap-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                <Bell size={12} /> Auto Remind
              </button>
              <button type="button" onClick={() => setShowCompose(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                <Plus size={12} /> New Event
              </button>
            </>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          { label: 'Total Events', value: data?.kpis.totalEvents ?? 0, color: 'text-slate-700' },
          { label: 'Upcoming', value: data?.kpis.upcoming ?? 0, color: 'text-indigo-600' },
          { label: 'Published', value: data?.kpis.published ?? 0, color: 'text-green-600' },
          { label: 'Drafts', value: data?.kpis.drafts ?? 0, color: 'text-amber-600' },
          { label: 'Invited', value: data?.kpis.totalInvited ?? 0, color: 'text-blue-600' },
          { label: 'Attending', value: data?.kpis.totalYes ?? 0, color: 'text-emerald-600' },
          { label: 'RSVP Rate', value: `${data?.kpis.avgRsvpRate ?? 0}%`, color: 'text-purple-600' },
          { label: 'Pending', value: data?.kpis.pendingRsvps ?? 0, color: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>
              {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
            </div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* List */}
        <div className={`${selectedId ? 'xl:col-span-2' : 'xl:col-span-5'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Events List</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Event</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Date</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Audience</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">RSVP %</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.events ?? []).map((e) => (
                  <tr key={e.id}
                    onClick={() => void loadDetail(e.id)}
                    className={`border-b border-slate-50 hover:bg-indigo-50/40 cursor-pointer ${selectedId === e.id ? 'bg-indigo-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <span>{EVENT_TYPE_ICON[e.eventType] ?? '📅'}</span>
                        {e.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        {e.venue && <><MapPin size={9} /> {e.venue}</>}
                        {e.pushSent && <Bell size={9} className="text-red-500 ml-1" />}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      <div>{formatDate(e.eventDate)}</div>
                      {e.eventTime && <div className="text-[10px] text-slate-400">{e.eventTime}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">{e.audienceLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {e.status === 'PUBLISHED' ? (
                        <div>
                          <span className={`font-bold ${e.rsvpResponseRate >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                            {e.rsvpResponseRate}%
                          </span>
                          <div className="text-[9px] text-slate-400">
                            {e.rsvpYesCount}✓ {e.rsvpPendingCount}⏳
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[e.status] ?? ''}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(data?.events ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        {selectedId && (
          <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {detailLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading…</div>
            ) : detail ? (
              <>
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <PartyPopper size={14} className="text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">{detail.event.title}</span>
                  </div>
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }}
                    className="p-1 hover:bg-slate-100 rounded"><X size={14} /></button>
                </div>

                <div className="p-3 border-b border-slate-100 space-y-2">
                  <p className="text-xs text-slate-600">{detail.detail.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{detail.event.eventTypeLabel}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100">{detail.event.audienceLabel}</span>
                    {detail.event.allowGuests && <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">+Guests allowed</span>}
                    {detail.event.autoRemindEnabled && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        Auto-remind {detail.event.remindDaysBefore}d before
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { label: 'Invited', value: detail.summary.inviteCount },
                      { label: 'Yes', value: detail.summary.yesCount, color: 'text-green-600' },
                      { label: 'No', value: detail.summary.noCount, color: 'text-red-600' },
                      { label: 'Maybe', value: detail.summary.maybeCount, color: 'text-amber-600' },
                      { label: 'Pending', value: detail.summary.pendingCount, color: 'text-slate-500' },
                      { label: 'Expected', value: detail.summary.expectedAttendance, color: 'text-indigo-600' },
                    ].map((k) => (
                      <div key={k.label} className="text-center bg-slate-50 rounded p-1.5">
                        <div className={`text-sm font-bold ${k.color ?? 'text-slate-800'}`}>{k.value}</div>
                        <div className="text-[9px] text-slate-500">{k.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {detail.event.status === 'DRAFT' && canPublish && (
                      <button type="button" onClick={() => void handlePublish(detail.event.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700">
                        <Send size={12} /> Publish &amp; Send Invites
                      </button>
                    )}
                    {detail.event.status === 'PUBLISHED' && detail.summary.pendingCount > 0 && canPublish && (
                      <button type="button" onClick={() => void handleResendReminders(detail.event.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-amber-300 text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100">
                        <Bell size={12} /> Resend RSVP Reminder ({detail.summary.pendingCount})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden min-h-[180px]">
                  <div className="border-r border-slate-100 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-green-50 border-b border-green-100 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="text-[10px] font-bold text-green-800">Attending ({detail.rsvps.yes.length})</span>
                    </div>
                    {detail.rsvps.yes.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                        <div className="font-semibold">{r.accountName}</div>
                        <div className="text-[10px] text-slate-500">{r.accountRole}{r.guestCount > 0 ? ` +${r.guestCount} guest(s)` : ''}</div>
                      </div>
                    ))}
                    {detail.rsvps.maybe.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1">
                          <HelpCircle size={12} className="text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-800">Maybe ({detail.rsvps.maybe.length})</span>
                        </div>
                        {detail.rsvps.maybe.map((r) => (
                          <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                            <div className="font-semibold">{r.accountName}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <div className="overflow-y-auto">
                    <div className="px-3 py-1.5 bg-red-50 border-b border-red-100 flex items-center gap-1">
                      <XCircle size={12} className="text-red-500" />
                      <span className="text-[10px] font-bold text-red-800">Declined ({detail.rsvps.no.length})</span>
                    </div>
                    {detail.rsvps.no.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                        <div className="font-semibold">{r.accountName}</div>
                      </div>
                    ))}
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1">
                      <Clock size={12} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-700">Pending ({detail.rsvps.pending.length})</span>
                    </div>
                    {detail.rsvps.pending.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs border-b border-slate-50">
                        <div className="font-semibold">{r.accountName}</div>
                        {r.reminderCount > 0 && <div className="text-[9px] text-amber-600">{r.reminderCount} reminder(s)</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Create Event Invitation</h3>
              <button type="button" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Event Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="Annual Day Celebration 2025" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Event Type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
                    {(data?.eventTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Venue</label>
                  <input value={venue} onChange={(e) => setVenue(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="School Auditorium" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Event Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Time</label>
                  <input value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="10:00 AM" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">RSVP Deadline</label>
                  <input type="date" value={rsvpDeadline} onChange={(e) => setRsvpDeadline(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Remind (days before)</label>
                  <input type="number" min={1} max={14} value={remindDaysBefore}
                    onChange={(e) => setRemindDaysBefore(Number(e.target.value))}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Audience</label>
                <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
                  {(data?.audienceOptions ?? []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {audienceType === 'CLASS' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Class Filter</label>
                  <input value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="10-A" />
                </div>
              )}
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={allowGuests} onChange={(e) => setAllowGuests(e.target.checked)} />
                <span className="font-semibold text-slate-700">Allow guests (family members)</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCompose(false)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg">Cancel</button>
                <button type="button" onClick={() => void handleCreate()} disabled={saving}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-3">
        <div className="text-xs font-bold text-indigo-800 mb-2">RSVP Workflow</div>
        <div className="flex flex-wrap gap-2">
          {(data?.workflowSteps ?? []).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className="text-[10px] bg-white border border-indigo-200 rounded-full px-2 py-0.5 text-indigo-700 font-medium">
                {i + 1}. {step}
              </span>
              {i < (data?.workflowSteps.length ?? 0) - 1 && <span className="text-indigo-300">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
