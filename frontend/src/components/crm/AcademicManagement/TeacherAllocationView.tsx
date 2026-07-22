import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Send, RefreshCw, Smartphone, Eye, Users, ClipboardList, Calendar,
  BookOpen, PartyPopper, Heart, ListTodo, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import {
  createTeacherAllocation, createTeacherRosterTask, fetchAcademicMeta, fetchTeacherRosterDashboard,
  publishTeacherRosterTasks, syncTeacherRosterAllocations, updateTeacherRosterTask,
  type TeacherRosterDashboard, type TeacherRosterTask,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CLASS_SUBJECT: <BookOpen size={12} />,
  TASK: <ListTodo size={12} />,
  ACTIVITY: <PartyPopper size={12} />,
  EVENT: <Calendar size={12} />,
  PARENT_ENGAGEMENT: <Heart size={12} />,
  OTHER: <ClipboardList size={12} />,
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-red-600 font-bold',
};

const EMPTY_TASK = {
  teacherName: '', department: 'General', taskType: 'TASK' as const, title: '', description: '',
  className: '', sectionName: '', subjectName: '', startDate: '', dueDate: '', endDate: '',
  priority: 'MEDIUM' as const, feedbackRequired: false, assignedBy: 'Academic Coordinator',
};

const EMPTY_ALLOC = {
  teacherName: '', department: 'General', className: '', sectionName: '', subjectName: '',
  periodsPerWeek: 18, workloadLevel: 'MEDIUM',
};

function TaskDetail({
  task, onClose, onSaveFeedback,
}: {
  task: TeacherRosterTask;
  onClose: () => void;
  onSaveFeedback: (notes: string, rating: number) => void;
}) {
  const [notes, setNotes] = useState(task.feedbackNotes);
  const [rating, setRating] = useState(task.parentFeedbackRating || 0);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: task.taskTypeColor }}>
              {task.taskTypeLabel}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_STYLES[task.status]}`}>{task.statusLabel}</span>
          </div>
          <h4 className="text-lg font-bold text-slate-900">{task.title}</h4>
          <p className="text-xs text-slate-500">{task.teacherName} · {task.department}</p>
        </div>
        {task.isPublished && <span className="text-xs text-green-600 flex items-center gap-1"><Smartphone size={12} /> Mobile</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Class</p><p className="font-semibold">{task.classGroup}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Subject</p><p className="font-semibold">{task.subjectName || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Due Date</p><p className={`font-semibold ${task.isOverdue ? 'text-red-600' : ''}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Priority</p><p className={`font-semibold ${PRIORITY_STYLES[task.priority]}`}>{task.priorityLabel}</p></div>
      </div>

      {task.description && <p className="text-slate-700 bg-white border rounded-lg p-3">{task.description}</p>}

      {task.taskType === 'PARENT_ENGAGEMENT' && (
        <div className="border border-pink-200 bg-pink-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-pink-700 uppercase">Parent Engagement Feedback</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`w-8 h-8 rounded-full text-sm font-bold ${rating >= n ? 'bg-pink-500 text-white' : 'bg-white border text-slate-400'}`}>{n}</button>
            ))}
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Record parent feedback notes…" className={am.input} rows={3} />
          <button type="button" onClick={() => onSaveFeedback(notes, rating)} className={am.btnPrimary}>Save Feedback</button>
        </div>
      )}

      <div className={`${am.card} p-3 bg-indigo-50 border-indigo-100`}>
        <p className="text-xs font-bold text-indigo-700">Visible on teacher mobile app under Task Management</p>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
      </div>
    </div>
  );
}

export function TeacherAllocationView() {
  const [dashboard, setDashboard] = useState<TeacherRosterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK });
  const [allocForm, setAllocForm] = useState({ ...EMPTY_ALLOC });
  const [detailTask, setDetailTask] = useState<TeacherRosterTask | null>(null);
  const [viewMode, setViewMode] = useState<'roster' | 'tasks'>('roster');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await fetchAcademicMeta();
      setYears(meta.academicYears);
      const d = await fetchTeacherRosterDashboard({
        academicYear, teacherName: teacherFilter || undefined, taskType: typeFilter || undefined,
      });
      setDashboard(d);
    } finally { setLoading(false); }
  }, [academicYear, teacherFilter, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const filteredTasks = useMemo(() => dashboard?.tasks || [], [dashboard]);

  const saveTask = async () => {
    await createTeacherRosterTask({ ...taskForm, academicYear });
    setMessage(`Task "${taskForm.title}" assigned to ${taskForm.teacherName}`);
    setShowTaskForm(false);
    setTaskForm({ ...EMPTY_TASK });
    void load();
  };

  const saveAlloc = async () => {
    await createTeacherAllocation({ ...allocForm, academicYear });
    setMessage(`Class allocation saved for ${allocForm.teacherName}`);
    setShowAllocForm(false);
    setAllocForm({ ...EMPTY_ALLOC });
    void load();
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      const r = await syncTeacherRosterAllocations(academicYear);
      setMessage(`Synced ${r.created} class/subject tasks from allocations`);
      void load();
    } finally { setBusy(false); }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      const r = await publishTeacherRosterTasks({ academicYear });
      setMessage(`Published ${r.published} tasks to teacher mobile apps`);
      void load();
    } finally { setBusy(false); }
  };

  const saveFeedback = async (notes: string, rating: number) => {
    if (!detailTask) return;
    await updateTeacherRosterTask(detailTask.id, {
      feedbackNotes: notes, parentFeedbackRating: rating, feedbackRecorded: true, status: 'COMPLETED',
    });
    setMessage('Parent engagement feedback recorded');
    setDetailTask(null);
    void load();
  };

  if (loading && !dashboard) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Teacher Allocation"
        title="Teacher Roster Planner"
        subtitle="Allocate teachers to classes, tasks, activities, events & parent engagements — synced to mobile task management"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handleSync()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw size={14} /> Sync Class Allocations
            </button>
            <button type="button" onClick={() => void handlePublish()} disabled={busy} className={am.btnSecondary}>
              <Send size={14} /> Publish to Mobile
            </button>
            <button type="button" onClick={() => setShowAllocForm(true)} className={am.btnSecondary}>
              <Plus size={14} /> Class Allocation
            </button>
            <button type="button" onClick={() => setShowTaskForm(true)} className={am.btnPrimary}>
              <Plus size={14} /> Assign Task
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        <AcademicYearTermFilters
          academicYear={academicYear} term="Term 1" years={years} terms={['Term 1', 'Term 2']}
          onYear={setAcademicYear} onTerm={() => {}}
        />

        {message && <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200">{message}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Teachers', value: dashboard?.kpis.totalTeachers ?? 0, icon: Users },
            { label: 'Total Tasks', value: dashboard?.kpis.totalTasks ?? 0, icon: ClipboardList },
            { label: 'Class/Subject', value: dashboard?.kpis.classSubjectAllocations ?? 0, icon: BookOpen },
            { label: 'In Progress', value: dashboard?.kpis.inProgress ?? 0, icon: RefreshCw },
            { label: 'Overdue', value: dashboard?.kpis.overdue ?? 0, icon: AlertTriangle },
          ].map((k) => (
            <div key={k.label} className={`${am.card} p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon size={14} className="text-teal-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Task type filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${!typeFilter ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
            All ({dashboard?.tasks.length ?? 0})
          </button>
          {(dashboard?.byType || []).map((t) => (
            <button key={t.id} type="button" onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${typeFilter === t.id ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
              {TYPE_ICONS[t.id]} {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-3">
          <input placeholder="Filter by teacher…" value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className={`${am.input} max-w-xs`} />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button type="button" onClick={() => setViewMode('roster')} className={`px-3 py-1.5 text-xs font-bold ${viewMode === 'roster' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}>By Teacher</button>
            <button type="button" onClick={() => setViewMode('tasks')} className={`px-3 py-1.5 text-xs font-bold ${viewMode === 'tasks' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}>All Tasks</button>
          </div>
        </div>

        {/* Teacher Roster View */}
        {viewMode === 'roster' && (
          <div className="space-y-4">
            {(dashboard?.teacherRosters || []).length === 0 ? (
              <p className="text-center text-slate-400 py-8">No teachers in roster. Add class allocations or assign tasks.</p>
            ) : (dashboard?.teacherRosters || []).map((tr) => (
              <div key={tr.teacherName} className={`${am.card} p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{tr.teacherName}</h3>
                    <p className="text-xs text-slate-500">{tr.department} · {tr.classSubjects.length} class/subject · {tr.totalTasks} tasks</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100">{tr.pending} pending</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">{tr.inProgress} active</span>
                    {tr.overdue > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">{tr.overdue} overdue</span>}
                  </div>
                </div>

                {tr.classSubjects.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Class & Subject</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tr.classSubjects.map((a) => (
                        <span key={String(a.id)} className="text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded px-2 py-1">
                          {String(a.subjectName)} — {String(a.className)}{a.sectionName ? `-${String(a.sectionName)}` : ''} ({String(a.periodsPerWeek)}p/w)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tr.tasks.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Task</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Class</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Due</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                        <th className="px-3 py-2" />
                      </tr></thead>
                      <tbody>
                        {tr.tasks.map((t) => (
                          <tr key={t.id} className={`border-t ${t.isOverdue ? 'bg-red-50/50' : ''}`}>
                            <td className="px-3 py-2"><span className="flex items-center gap-1">{TYPE_ICONS[t.taskType]} {t.taskTypeLabel}</span></td>
                            <td className="px-3 py-2 font-medium">{t.title}</td>
                            <td className="px-3 py-2">{t.classGroup}</td>
                            <td className="px-3 py-2">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded font-bold ${STATUS_STYLES[t.status]}`}>{t.statusLabel}</span></td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => setDetailTask(t)} className="text-slate-500 hover:text-teal-600"><Eye size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All Tasks View */}
        {viewMode === 'tasks' && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr>
                <th className={am.th}>Type</th><th className={am.th}>Task</th><th className={am.th}>Teacher</th>
                <th className={am.th}>Class</th><th className={am.th}>Due</th><th className={am.th}>Priority</th>
                <th className={am.th}>Status</th><th className={am.th}>Mobile</th><th className={am.th} />
              </tr></thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={9} className={`${am.td} text-center text-slate-400 py-8`}>No tasks assigned yet.</td></tr>
                ) : filteredTasks.map((t) => (
                  <tr key={t.id} className={t.isOverdue ? 'bg-red-50/30' : ''}>
                    <td className={am.td}><span className="text-xs flex items-center gap-1">{TYPE_ICONS[t.taskType]} {t.taskTypeLabel}</span></td>
                    <td className={am.td}><p className="font-semibold">{t.title}</p></td>
                    <td className={am.td}>{t.teacherName}</td>
                    <td className={am.td}>{t.classGroup}</td>
                    <td className={am.td}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td className={am.td}><span className={PRIORITY_STYLES[t.priority]}>{t.priorityLabel}</span></td>
                    <td className={am.td}><span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_STYLES[t.status]}`}>{t.statusLabel}</span></td>
                    <td className={am.td}>{t.isPublished ? <CheckCircle2 size={14} className="text-green-600" /> : '—'}</td>
                    <td className={am.td}><button type="button" onClick={() => setDetailTask(t)} className="p-1 text-slate-500 hover:text-teal-600"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Task Modal */}
      <AcademicModal open={showTaskForm} onClose={() => setShowTaskForm(false)} title="Assign Roster Task" large>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <input placeholder="Teacher Name *" value={taskForm.teacherName} onChange={(e) => setTaskForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          <input placeholder="Department" value={taskForm.department} onChange={(e) => setTaskForm((f) => ({ ...f, department: e.target.value }))} className={am.input} />
          <select value={taskForm.taskType} onChange={(e) => setTaskForm((f) => ({ ...f, taskType: e.target.value as typeof f.taskType, feedbackRequired: e.target.value === 'PARENT_ENGAGEMENT' }))} className={`${am.input} col-span-2`}>
            {(dashboard?.taskTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label} — {t.description}</option>)}
          </select>
          <input placeholder="Task Title *" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className={`${am.input} col-span-2`} />
          <input placeholder="Class" value={taskForm.className} onChange={(e) => setTaskForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section" value={taskForm.sectionName} onChange={(e) => setTaskForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input placeholder="Subject (if applicable)" value={taskForm.subjectName} onChange={(e) => setTaskForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
          <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as typeof f.priority }))} className={am.input}>
            <option value="LOW">Low Priority</option><option value="MEDIUM">Medium Priority</option><option value="HIGH">High Priority</option>
          </select>
          <input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm((f) => ({ ...f, startDate: e.target.value }))} className={am.input} />
          <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} className={am.input} />
          <textarea placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
          {taskForm.taskType === 'PARENT_ENGAGEMENT' && (
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={taskForm.feedbackRequired} onChange={(e) => setTaskForm((f) => ({ ...f, feedbackRequired: e.target.checked }))} />
              Require parent feedback recording on completion
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowTaskForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveTask()} className={am.btnPrimary} disabled={!taskForm.teacherName || !taskForm.title}>Assign Task</button>
        </div>
      </AcademicModal>

      {/* Class Allocation Modal */}
      <AcademicModal open={showAllocForm} onClose={() => setShowAllocForm(false)} title="Class & Subject Allocation" large>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Teacher Name *" value={allocForm.teacherName} onChange={(e) => setAllocForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          <input placeholder="Department" value={allocForm.department} onChange={(e) => setAllocForm((f) => ({ ...f, department: e.target.value }))} className={am.input} />
          <input placeholder="Class *" value={allocForm.className} onChange={(e) => setAllocForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section" value={allocForm.sectionName} onChange={(e) => setAllocForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input placeholder="Subject *" value={allocForm.subjectName} onChange={(e) => setAllocForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Periods/Week" value={allocForm.periodsPerWeek} onChange={(e) => setAllocForm((f) => ({ ...f, periodsPerWeek: Number(e.target.value) }))} className={am.input} />
          <select value={allocForm.workloadLevel} onChange={(e) => setAllocForm((f) => ({ ...f, workloadLevel: e.target.value }))} className={am.input}>
            <option value="FULL">Full Load</option><option value="MEDIUM">Medium Load</option><option value="LOW">Low Load</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowAllocForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveAlloc()} className={am.btnPrimary} disabled={!allocForm.teacherName || !allocForm.className || !allocForm.subjectName}>Save Allocation</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!detailTask} onClose={() => setDetailTask(null)} title="Task Details" large>
        {detailTask && <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} onSaveFeedback={(n, r) => void saveFeedback(n, r)} />}
      </AcademicModal>
    </AcademicPageShell>
  );
}
