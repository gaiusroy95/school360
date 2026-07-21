import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle,
  Video,
  Phone,
  Mail,
  Pencil,
  X,
  MapPin,
  User,
  Loader2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchFollowUpTasks,
  fetchFollowUpTaskMeta,
  addFollowUpTask,
  updateFollowUpTask,
  type FollowUpTask,
  type FollowUpMode,
  type FollowUpTaskMeta,
} from '../../../lib/admissionServices';

type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
type ModeFilter = 'all' | FollowUpMode;

const MODE_ICONS: Record<string, React.ReactNode> = {
  Phone: <Phone size={14} className="text-blue-500" />,
  'Campus Visit': <MapPin size={14} className="text-emerald-500" />,
  'Video Call': <Video size={14} className="text-purple-500" />,
  Email: <Mail size={14} className="text-amber-500" />,
  'In-person Counselling': <User size={14} className="text-indigo-500" />,
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isOverdue(task: FollowUpTask): boolean {
  if (task.status === 'Completed') return false;
  const due = new Date(task.scheduledAt || `${task.dueDate}T00:00:00`);
  return startOfDay(due).getTime() < startOfDay(new Date()).getTime();
}

function formatScheduleLabel(task: FollowUpTask): string {
  const due = new Date(task.scheduledAt || `${task.dueDate}T00:00:00`);
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  let dayLabel = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (diff === 0) dayLabel = 'Today';
  else if (diff === 1) dayLabel = 'Tomorrow';
  else if (diff === -1) dayLabel = 'Yesterday';

  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    const t = new Date(due);
    t.setHours(h, m, 0, 0);
    const timeLabel = t.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    return `${dayLabel}, ${timeLabel}`;
  }
  return dayLabel;
}

type TaskFormState = {
  enquiryDbId: string;
  title: string;
  mode: FollowUpMode;
  subject: string;
  discussionNotes: string;
  dueDate: string;
  dueTime: string;
  assignedTo: string;
};

const emptyForm = (performer: string): TaskFormState => ({
  enquiryDbId: '',
  title: '',
  mode: 'Phone',
  subject: '',
  discussionNotes: '',
  dueDate: new Date().toISOString().slice(0, 10),
  dueTime: '10:00',
  assignedTo: performer,
});

export function FollowUpsView() {
  const { user } = useAuth();
  const performer = user?.displayName || user?.email || 'Counselor';

  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [meta, setMeta] = useState<FollowUpTaskMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUpTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm(performer));
  const [useCustomCounselor, setUseCustomCounselor] = useState(false);

  const counselorOptions = useMemo(() => {
    const names = new Set<string>();
    if (performer) names.add(performer);
    for (const c of meta?.counselors ?? []) {
      if (c.trim()) names.add(c.trim());
    }
    if (form.assignedTo.trim()) names.add(form.assignedTo.trim());
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [meta?.counselors, performer, form.assignedTo]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [tasksRes, metaRes] = await Promise.all([fetchFollowUpTasks(), fetchFollowUpTaskMeta()]);
      setTasks(tasksRes.tasks);
      setMeta(metaRes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const summary = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    let pending = 0;
    let completedThisWeek = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.status === 'Completed') {
        const updated = task.updatedAt ? new Date(task.updatedAt) : null;
        if (updated && updated >= weekStart) completedThisWeek += 1;
      } else {
        pending += 1;
        if (isOverdue(task)) overdue += 1;
      }
    }
    return { pending, completedThisWeek, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (statusFilter === 'pending') return t.status === 'Pending';
        if (statusFilter === 'completed') return t.status === 'Completed';
        if (statusFilter === 'overdue') return isOverdue(t);
        return true;
      })
      .filter((t) => (modeFilter === 'all' ? true : t.mode === modeFilter))
      .sort((a, b) => {
        const ad = new Date(a.scheduledAt || a.dueDate).getTime();
        const bd = new Date(b.scheduledAt || b.dueDate).getTime();
        if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1;
        return ad - bd;
      });
  }, [tasks, statusFilter, modeFilter]);

  const openSchedule = () => {
    setEditingTask(null);
    setForm(emptyForm(performer));
    setUseCustomCounselor(false);
    setModalOpen(true);
  };

  const openEdit = (task: FollowUpTask) => {
    const assignedTo = task.assignedTo || performer;
    const known = new Set([performer, ...(meta?.counselors ?? [])].filter(Boolean));
    setEditingTask(task);
    setForm({
      enquiryDbId: task.enquiryDbId || '',
      title: task.title,
      mode: (task.mode as FollowUpMode) || 'Phone',
      subject: task.subject || '',
      discussionNotes: task.discussionNotes || '',
      dueDate: task.dueDate,
      dueTime: task.dueTime || '',
      assignedTo,
    });
    setUseCustomCounselor(assignedTo !== '' && !known.has(assignedTo));
    setModalOpen(true);
  };

  const handleComplete = async (task: FollowUpTask) => {
    if (!task.id || task.status === 'Completed') return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateFollowUpTask(task.id, { status: 'Completed' });
      setSuccessMsg('Task marked as completed');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.enquiryDbId && !editingTask) {
      setErrorMsg('Please select an enquiry');
      return;
    }
    if (!form.dueDate) {
      setErrorMsg('Due date is required');
      return;
    }
    if (!form.subject.trim() && !form.title.trim()) {
      setErrorMsg('Subject or title is required');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        title: form.title.trim() || undefined,
        mode: form.mode,
        subject: form.subject.trim(),
        discussionNotes: form.discussionNotes.trim() || undefined,
        dueDate: form.dueDate,
        dueTime: form.dueTime || undefined,
        assignedTo: form.assignedTo.trim() || performer,
      };

      if (editingTask?.id) {
        await updateFollowUpTask(editingTask.id, payload);
        setSuccessMsg('Follow-up updated');
      } else {
        await addFollowUpTask(form.enquiryDbId, payload);
        setSuccessMsg('Follow-up scheduled');
      }
      setModalOpen(false);
      setEditingTask(null);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const modes = meta?.modes || [
    'Phone',
    'Campus Visit',
    'Video Call',
    'Email',
    'In-person Counselling',
  ];

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Follow Ups</h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule campus visits, assign counseling mode & subject to counselors
          </p>
        </div>
        <button
          type="button"
          onClick={openSchedule}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 self-start"
        >
          <Calendar size={16} /> Schedule Task
        </button>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            errorMsg ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-slate-400" />
        {(['all', 'pending', 'completed', 'overdue'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="text-slate-300 mx-1">|</span>
        <button
          type="button"
          onClick={() => setModeFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            modeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          All modes
        </button>
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModeFilter(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              modeFilter === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-slate-800 mb-2">
            {statusFilter === 'completed' ? 'Completed Tasks' : 'Upcoming Tasks'}
            <span className="text-slate-400 font-normal ml-2">({filteredTasks.length})</span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
              No follow-up tasks match your filters.
              <button type="button" onClick={openSchedule} className="block mx-auto mt-3 text-indigo-600 font-medium hover:underline">
                Schedule a task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const mode = task.mode || 'Phone';
              const overdue = isOverdue(task);
              return (
                <div
                  key={task.id}
                  className={`bg-white p-4 rounded-xl border shadow-sm flex items-start justify-between group transition-colors ${
                    overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                      {MODE_ICONS[mode] || <Phone size={14} className="text-blue-500" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {task.title}
                      </h4>
                      {task.subject && task.subject !== task.title && (
                        <p className="text-xs text-slate-600 mt-0.5">Subject: {task.subject}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.enquiryName || task.enquiryId}
                        {task.assignedTo ? ` · Counselor: ${task.assignedTo}` : ''}
                      </p>
                      {task.discussionNotes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                          &ldquo;{task.discussionNotes}&rdquo;
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{mode}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            overdue ? 'bg-red-100 text-red-600' : 'text-slate-400'
                          }`}
                        >
                          <Clock size={10} /> {formatScheduleLabel(task)}
                          {overdue && ' · Overdue'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {task.status !== 'Completed' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleComplete(task)}
                        title="Mark complete"
                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors border border-slate-100 disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      title="Edit task"
                      className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Task Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="text-sm font-bold text-slate-800">{summary.pending}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Completed (This Week)</span>
                <span className="text-sm font-bold text-green-600">{summary.completedThisWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Overdue</span>
                <span className="text-sm font-bold text-red-500">{summary.overdue}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <h3 className="font-semibold text-indigo-900 text-sm mb-2">Counseling Modes</h3>
            <p className="text-xs text-indigo-700/80 mb-3">Assign mode when scheduling a follow-up</p>
            <div className="space-y-2">
              {modes.map((m) => (
                <div key={m} className="bg-white/60 p-2 rounded text-xs text-indigo-800 flex items-center gap-2">
                  {MODE_ICONS[m]}
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingTask ? 'Edit Follow Up' : 'Schedule Follow Up'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingTask(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-4">
              {!editingTask && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enquiry *</label>
                  <select
                    required
                    value={form.enquiryDbId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const enq = meta?.enquiries.find((x) => x.id === id);
                      const assignedTo = enq?.assignedTo || performer;
                      const known = new Set([performer, ...(meta?.counselors ?? [])]);
                      setForm((f) => ({
                        ...f,
                        enquiryDbId: id,
                        assignedTo,
                      }));
                      setUseCustomCounselor(assignedTo !== '' && !known.has(assignedTo));
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select enquiry...</option>
                    {(meta?.enquiries || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.enquirerName} ({e.enquiryId}) — {e.classInterested || 'Class N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Counseling Mode *</label>
                  <select
                    required
                    value={form.mode}
                    onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as FollowUpMode }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {modes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Counselor *</label>
                  <select
                    required={!useCustomCounselor}
                    value={useCustomCounselor ? '__custom__' : form.assignedTo}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__custom__') {
                        setUseCustomCounselor(true);
                        setForm((f) => ({ ...f, assignedTo: '' }));
                        return;
                      }
                      setUseCustomCounselor(false);
                      setForm((f) => ({ ...f, assignedTo: value }));
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="" disabled>
                      Select counselor...
                    </option>
                    {counselorOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__custom__">Other counselor...</option>
                  </select>
                  {useCustomCounselor && (
                    <input
                      required
                      autoFocus
                      value={form.assignedTo}
                      onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                      className="w-full mt-2 p-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Enter counselor name"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  required={!form.title.trim()}
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. Fee structure discussion, Campus tour for Nursery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title (optional)</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Auto-generated from mode + subject if empty"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discussion Notes</label>
                <textarea
                  rows={3}
                  value={form.discussionNotes}
                  onChange={(e) => setForm((f) => ({ ...f, discussionNotes: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Notes from parent/child conversation..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingTask ? 'Save Changes' : 'Schedule Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
