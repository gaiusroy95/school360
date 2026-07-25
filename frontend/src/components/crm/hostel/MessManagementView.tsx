import { useCallback, useEffect, useState } from 'react';
import {
  Utensils, IndianRupee, TrendingUp, Users, Calendar, RefreshCw, Download,
  Plus, Scan, Star, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  fetchMessManagement,
  upsertHostelMessMenu,
  logHostelMessAttendance,
  recordHostelMessExpense,
  exportHostelMess,
  type MessManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export function MessManagementView() {
  const [data, setData] = useState<MessManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [weekStart, setWeekStart] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [menuModal, setMenuModal] = useState<{ mealTypeId: string; dateIso: string; menuItems: string } | null>(null);
  const [expenseModal, setExpenseModal] = useState(false);
  const [scanForm, setScanForm] = useState({ studentId: '', studentName: '', mealTypeId: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'Raw Materials', description: '', amount: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchMessManagement(seed, academicYear, weekStart || undefined);
      setData(result);
      if (!weekStart) setWeekStart(result.weekStartIso);
    } finally {
      setLoading(false);
    }
  }, [academicYear, weekStart]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const shiftWeek = (days: number) => {
    if (!weekStart) return;
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const handlePublishMenu = async (publish: boolean) => {
    if (!menuModal) return;
    try {
      const result = await upsertHostelMessMenu({
        ...menuModal,
        academicYear,
        publish,
      });
      flash(result.notification ?? result.message, 'success');
      setMenuModal(null);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleScan = async () => {
    if (!scanForm.studentName || !scanForm.mealTypeId) {
      flash('Student name and meal type required', 'error');
      return;
    }
    try {
      const result = await logHostelMessAttendance({
        ...scanForm,
        studentId: scanForm.studentId || `STU-SCAN-${Date.now()}`,
        scanMethod: 'RFID',
        academicYear,
      });
      flash(result.message, 'success');
      setScanForm({ studentId: '', studentName: '', mealTypeId: '' });
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  const handleExpense = async () => {
    try {
      const result = await recordHostelMessExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount),
        academicYear,
      });
      flash(result.message, 'success');
      setExpenseModal(false);
      setExpenseForm({ category: 'Raw Materials', description: '', amount: '' });
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mess Management</h2>
          <p className="text-xs text-slate-500">Weekly menus · RFID attendance · Fee accounting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportHostelMess(academicYear, 'PDF', 'Daily Consumption Report').then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {perms?.canViewFinancials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Collection', value: data?.financials.totalCollection, icon: <IndianRupee size={16} className="text-green-600" /> },
            { label: 'Expense', value: data?.financials.totalExpense, icon: <TrendingUp size={16} className="text-red-500" /> },
            { label: 'Mess Balance', value: data?.financials.messBalance, icon: <IndianRupee size={16} className="text-teal-600" /> },
            { label: 'Students Opted', value: data?.financials.studentsOpted ?? 0, icon: <Users size={16} className="text-blue-600" /> },
          ].map((k) => (
            <div key={k.label} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 mb-1">{k.icon}{k.label}</div>
              <p className="text-lg font-bold text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-slate-800 flex items-center gap-1"><Calendar size={12} /> Weekly Meal Planner</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftWeek(-7)} className="p-1 border rounded"><ChevronLeft size={14} /></button>
              <span className="text-[10px] font-medium">Week of {data?.weekStart}</span>
              <button type="button" onClick={() => shiftWeek(7)} className="p-1 border rounded"><ChevronRight size={14} /></button>
            </div>
          </div>

          {(data?.importantNotices ?? []).map((n, i) => (
            <div key={i} className="mb-3 text-[9px] bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle size={12} /> {n.title}
            </div>
          ))}

          <div className="overflow-x-auto">
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 text-left border">Meal</th>
                  {(data?.calendar ?? []).map((day) => (
                    <th key={day.dateIso} className={`p-2 text-left border min-w-[100px] ${day.isToday ? 'bg-blue-50' : ''}`}>
                      {day.date}{day.isToday && <span className="block text-blue-600 font-bold">Today</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.mealTypes ?? []).map((mt) => (
                  <tr key={mt.id}>
                    <td className="p-2 border font-bold bg-slate-50">
                      {mt.name}<br /><span className="text-slate-500 font-normal">{mt.timeRange}</span>
                    </td>
                    {(data?.calendar ?? []).map((day) => {
                      const meal = day.meals.find((m) => m.mealTypeId === mt.id);
                      return (
                        <td
                          key={day.dateIso}
                          className={`p-2 border align-top cursor-pointer hover:bg-blue-50 ${meal?.isClosed ? 'bg-red-50' : ''} ${day.isToday ? 'bg-blue-50/30' : ''}`}
                          onClick={() => perms?.canPublishMenu && setMenuModal({ mealTypeId: mt.id, dateIso: day.dateIso, menuItems: meal?.menuItems ?? '' })}
                        >
                          {meal?.isClosed ? <span className="text-red-600 font-bold">CLOSED</span> : (meal?.menuItems || '—')}
                          {meal?.isPublished && <span className="block text-green-600 text-[7px]">Published</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Top Meal Preferences</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.preferenceChart ?? []} dataKey="pct" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={45}>
                    {(data?.preferenceChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 text-[8px]">
              {(data?.preferenceChart ?? []).map((p) => (
                <span key={p.name} style={{ color: p.color }}>{p.name} {p.pct}%</span>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Today&apos;s Consumption</h3>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.todayConsumption ?? []}>
                  <XAxis dataKey="meal" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} width={25} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {perms?.canMarkAttendance && (
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Scan size={12} /> RFID / QR Scan</h3>
            <div className="space-y-2 text-[10px]">
              <input value={scanForm.studentName} onChange={(e) => setScanForm((f) => ({ ...f, studentName: e.target.value }))} placeholder="Student name" className="w-full border rounded px-2 py-1.5" />
              <select value={scanForm.mealTypeId} onChange={(e) => setScanForm((f) => ({ ...f, mealTypeId: e.target.value }))} className="w-full border rounded px-2 py-1.5">
                <option value="">Select meal...</option>
                {(data?.mealTypes ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" onClick={() => void handleScan()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Log Attendance</button>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl p-4 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold text-slate-800 flex items-center gap-1"><Utensils size={12} /> Today&apos;s Attendance Log</h3>
            {perms?.canRecordExpense && (
              <button type="button" onClick={() => setExpenseModal(true)} className="text-[9px] border px-2 py-1 rounded flex items-center gap-1"><Plus size={10} /> Expense</button>
            )}
          </div>
          <div className="overflow-auto max-h-40">
            <table className="w-full text-[9px]">
              <thead><tr className="text-slate-500 border-b"><th className="pb-1 text-left">Student</th><th>Meal</th><th>Method</th><th>Time</th></tr></thead>
              <tbody className="divide-y">
                {(data?.todayAttendance ?? []).map((a) => (
                  <tr key={a.id}><td className="py-1 font-medium">{a.studentName}</td><td>{a.meal}</td><td>{a.scanMethod}{a.isManual && ' (M)'}</td><td>{a.time}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-2">Recent Expenses</h3>
          {(data?.expenses ?? []).map((e) => (
            <div key={e.id} className="text-[9px] border-b py-1.5 flex justify-between">
              <span>{e.description} <span className="text-slate-500">({e.category})</span></span>
              <span className="font-bold">{e.amount}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Star size={12} /> Student Feedback</h3>
          {(data?.feedbacks ?? []).map((f) => (
            <div key={f.id} className="text-[9px] border-b py-1.5">
              <span className="font-bold">{f.studentName}</span> · {f.meal} · {'★'.repeat(f.rating)}
              {f.comments && <p className="text-slate-500">{f.comments}</p>}
            </div>
          ))}
          {(data?.rebatesSummary ?? []).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-[9px] font-bold text-slate-600 mb-1">Auto Rebates (Leave &gt; 3 days)</p>
              {data?.rebatesSummary.map((r, i) => (
                <p key={i} className="text-[9px]">{r.studentName}: {r.leaveDays} days → {r.rebateAmount}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <AcademicModal open={!!menuModal} onClose={() => setMenuModal(null)} title="Edit Menu">
        {menuModal && (
          <div className="space-y-3 text-sm">
            <textarea value={menuModal.menuItems} onChange={(e) => setMenuModal({ ...menuModal, menuItems: e.target.value })} className="w-full border rounded px-2 py-1.5 text-xs" rows={3} />
            <div className="flex gap-2">
              <button type="button" onClick={() => void handlePublishMenu(false)} className="flex-1 border py-2 rounded-lg text-xs font-bold">Save Draft</button>
              <button type="button" onClick={() => void handlePublishMenu(true)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Publish to App</button>
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={expenseModal} onClose={() => setExpenseModal(false)} title="Record Expense">
        <div className="space-y-3 text-sm">
          <input value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full border rounded px-2 py-1.5 text-xs" />
          <input value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Amount" type="number" className="w-full border rounded px-2 py-1.5 text-xs" />
          <button type="button" onClick={() => void handleExpense()} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs">Save Expense</button>
        </div>
      </AcademicModal>
    </div>
  );
}
