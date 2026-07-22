import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, MessageSquare, User, Send, CheckCircle, Download,
  PhoneCall, Calendar as CalendarIcon, Star, TrendingDown, RefreshCw, Eye,
  AlertTriangle, Sparkles, BarChart3, ArrowRight, X,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { toViewKey } from '../../../lib/navigation';
import {
  fetchParents, fetchParentsMeta, fetchParentDetail, seedParents,
  setParentProfileKey, type ParentListItem, type ParentSummary, type ParentDetail,
} from '../../../lib/parentServices';
import { downloadParentsExcel } from '../../../lib/parentExcel';
import { ParentLoading, ParentPageHeader, ParentPageShell, pm } from './ParentManagementUi';

type Props = { onNavigate?: (view: string) => void };

function formatNum(n: number) {
  return n.toLocaleString('en-IN');
}

export function ParentsListView({ onNavigate }: Props) {
  const [summary, setSummary] = useState<ParentSummary | null>(null);
  const [engagementTrend, setEngagementTrend] = useState<{ name: string; messages: number; ptm: number; logins: number }[]>([]);
  const [topicBreakdown, setTopicBreakdown] = useState<{ name: string; count: number; percent: number }[]>([]);
  const [parents, setParents] = useState<ParentListItem[]>([]);
  const [laggingParents, setLaggingParents] = useState<ParentListItem[]>([]);
  const [exceptionalParents, setExceptionalParents] = useState<ParentListItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'father' | 'mother'>('all');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const nav = useCallback(
    (page: string) => onNavigate?.(toViewKey('Parent Management', page)),
    [onNavigate],
  );

  const listParams = useMemo(() => {
    const p: Parameters<typeof fetchParents>[0] = {
      academicYear: academicYear || undefined,
      className: className || undefined,
      sectionName: sectionName || undefined,
      q: search || undefined,
    };
    if (activeTab === 'active') p.status = 'Active';
    if (activeTab === 'inactive') p.status = 'Inactive';
    if (activeTab === 'father') p.relationship = 'FATHER';
    if (activeTab === 'mother') p.relationship = 'MOTHER';
    if (relationship) p.relationship = relationship;
    if (status) p.status = status;
    return p;
  }, [academicYear, className, sectionName, search, activeTab, relationship, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const year = academicYear || undefined;
      const [meta, list, lagging, exceptional] = await Promise.all([
        fetchParentsMeta(year),
        fetchParents(listParams),
        fetchParents({ ...listParams, engagement: 'lagging' }),
        fetchParents({ ...listParams, engagement: 'exceptional' }),
      ]);
      setSummary(meta.summary);
      setEngagementTrend(meta.engagementTrend);
      setTopicBreakdown(meta.topicBreakdown);
      setParents(list.parents);
      setLaggingParents(lagging.parents);
      setExceptionalParents(exceptional.parents);
      setClassOptions(meta.filters.classes);
      setYearOptions(meta.filters.academicYears);
      setSectionOptions(className ? meta.filters.sectionsByClass[className] || [] : []);
      if (!academicYear) setAcademicYear(meta.defaultAcademicYear);

      if (meta.summary.total === 0) {
        await seedParents();
        const [meta2, list2, lag2, exc2] = await Promise.all([
          fetchParentsMeta(meta.defaultAcademicYear),
          fetchParents({ academicYear: meta.defaultAcademicYear }),
          fetchParents({ academicYear: meta.defaultAcademicYear, engagement: 'lagging' }),
          fetchParents({ academicYear: meta.defaultAcademicYear, engagement: 'exceptional' }),
        ]);
        setSummary(meta2.summary);
        setParents(list2.parents);
        setLaggingParents(lag2.parents);
        setExceptionalParents(exc2.parents);
        setMessage('Demo parent engagement data seeded.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load parents');
    } finally {
      setLoading(false);
    }
  }, [academicYear, className, listParams]);

  useEffect(() => { void load(); }, [load]);

  const selectParent = async (key: string) => {
    setSelectedKey(key);
    setDetailLoading(true);
    try {
      const d = await fetchParentDetail(key);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const feesData = detail
    ? [
        { name: 'Paid', value: detail.fees.paid, color: '#3b82f6' },
        { name: 'Outstanding', value: detail.fees.due, color: '#f97316' },
      ]
    : [];

  const kpis = summary
    ? [
        { title: 'Total Parents', value: formatNum(summary.total), color: 'bg-blue-600', icon: <Users size={20} /> },
        { title: 'Active Parents', value: formatNum(summary.activeOpen), subtitle: summary.total ? `${Math.round((summary.activeOpen / summary.total) * 100)}% of total` : '', color: 'bg-green-500', icon: <MessageSquare size={20} /> },
        { title: 'New This Year', value: formatNum(summary.newThisYear), color: 'bg-purple-500', icon: <User size={20} /> },
        { title: 'PTM Meetings', value: formatNum(summary.ptmMeetings), subtitle: 'This Academic Year', color: 'bg-orange-500', icon: <Users size={20} /> },
        { title: 'Messages Sent', value: formatNum(summary.messagesSent), subtitle: 'This Academic Year', color: 'bg-teal-500', icon: <Send size={20} /> },
        { title: 'Satisfaction Score', value: summary.satisfactionScore ? `${summary.satisfactionScore.toFixed(1)} / 5` : '—', color: 'bg-yellow-500', icon: <CheckCircle size={20} /> },
      ]
    : [];

  const tabCounts = useMemo(() => ({
    all: parents.length,
    active: parents.filter((p) => p.status === 'Active').length,
    inactive: parents.filter((p) => p.status === 'Inactive').length,
    father: parents.filter((p) => p.relationship === 'Father').length,
    mother: parents.filter((p) => p.relationship === 'Mother').length,
  }), [parents]);

  const engagementStats = useMemo(() => {
    const scored = parents.filter((p) => p.engagementScore != null);
    const lagging = parents.filter((p) => p.engagementTier === 'lagging').length;
    const exceptional = parents.filter((p) => p.engagementTier === 'exceptional').length;
    const normal = scored.length - lagging - exceptional;
    const avg = scored.length
      ? Math.round(scored.reduce((s, p) => s + (p.engagementScore ?? 0), 0) / scored.length)
      : null;
    return { lagging, exceptional, normal, avg, total: parents.length };
  }, [parents]);

  const hasActiveFilters = Boolean(className || sectionName || relationship || status || search);

  const clearFilters = () => {
    setClassName('');
    setSectionName('');
    setRelationship('');
    setStatus('');
    setSearch('');
  };

  const quickLinks = [
    { label: 'Communication Log', page: 'Communication Log' },
    { label: 'Parent Meetings (PTM)', page: 'Parent Meetings (PTM)' },
    { label: 'Parent Categories', page: 'Parent Categories' },
    { label: 'Parents Engagement', page: 'Parents Engagement' },
  ] as const;

  const renderParentTable = (rows: ParentListItem[], showActions = false) => (
    <table className={`${pm.table} min-w-[700px] text-[11px]`}>
      <thead className={pm.tableHead}>
        <tr>
          <th className={pm.thSm}>Parent Name</th>
          <th className={pm.thSm}>Student(s)</th>
          <th className={pm.thSm}>Relationship</th>
          <th className={pm.thSm}>Mobile</th>
          <th className={pm.thSm}>Score</th>
          <th className={pm.thSm}>Last Comm</th>
          {showActions && <th className={pm.thSm}>Actions</th>}
        </tr>
      </thead>
      <tbody className={pm.tbody}>
        {rows.map((p) => (
          <tr
            key={p.parentKey}
            className={`${pm.trHover} cursor-pointer ${selectedKey === p.parentKey ? 'bg-indigo-50/60' : ''}`}
            onClick={() => void selectParent(p.parentKey)}
          >
            <td className={`${pm.tdSm} font-semibold text-slate-800`}>{p.name}</td>
            <td className={pm.tdSm}>
              {p.students.map((s, i) => (
                <div key={i} className="text-slate-600">{s.name} ({s.class})</div>
              ))}
            </td>
            <td className={pm.tdSm}>{p.relationship}</td>
            <td className={pm.tdSm}>{p.mobile}</td>
            <td className={pm.tdSm}>
              {p.engagementScore != null ? (
                <span className={`font-bold ${p.engagementTier === 'lagging' ? 'text-red-600' : p.engagementTier === 'exceptional' ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {p.engagementScore}
                </span>
              ) : '—'}
            </td>
            <td className={`${pm.tdSm} text-slate-500`}>{p.lastComm}</td>
            {showActions && (
              <td className={pm.tdSm} onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => nav('Parent Meetings (PTM)')} className={`${pm.badge} ${pm.badgeAmber}`}>Schedule PTM</button>
                  <button type="button" onClick={() => nav('Communication Log')} className={`${pm.badge} ${pm.badgeBlue}`}>Send Message</button>
                  <button type="button" onClick={() => nav('Communication Log')} className={`${pm.badge} ${pm.badgeSlate}`}>Log Call</button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (loading && !summary) return <ParentLoading label="Loading parents…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parents List"
        title="Parent Management CRM"
        subtitle="Parents derived from enrolled students — engagement, communication & fees."
        actions={
          <>
            <button type="button" onClick={() => downloadParentsExcel(parents)} className={pm.btnSecondary}>
              <Download size={14} /> Export Excel
            </button>
            <button type="button" onClick={() => void load()} className={pm.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      <div className={`${pm.content} space-y-5`}>
      {message && <p className={pm.message}>{message}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={pm.kpiCard}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>{kpi.icon}</div>
              <div className="min-w-0">
                <p className={pm.kpiLabel}>{kpi.title}</p>
                <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
                {kpi.subtitle && <p className="text-[9px] text-slate-500">{kpi.subtitle}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {laggingParents.length > 0 && (
        <div className={pm.alertDanger}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-red-600" />
              <h3 className="text-sm font-bold text-red-900">Lagging Parents — Needs Attention ({laggingParents.length})</h3>
            </div>
            <button type="button" onClick={() => downloadParentsExcel(laggingParents, 'Lagging_Parents.xlsx')} className="text-xs font-bold text-red-700 flex items-center gap-1 hover:underline">
              <Download size={12} /> Download Excel
            </button>
          </div>
          <div className={pm.alertInner}>{renderParentTable(laggingParents.slice(0, 5), true)}</div>
        </div>
      )}

      {exceptionalParents.length > 0 && (
        <div className={pm.alertSuccess}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-900">Highly Engaged Parents ({exceptionalParents.length})</h3>
            </div>
            <button type="button" onClick={() => downloadParentsExcel(exceptionalParents, 'Exceptional_Parents.xlsx')} className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline">
              <Download size={12} /> Download Excel
            </button>
          </div>
          <div className={pm.alertInner}>{renderParentTable(exceptionalParents.slice(0, 5))}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className={`${pm.card} ${pm.cardPad} space-y-3 shrink-0`}>
            <h3 className={pm.cardTitle}>Filter Parents</h3>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={pm.selectFull}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={pm.selectFull}>
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={pm.selectFull}>
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={pm.selectFull}>
              <option value="">All Relationships</option>
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={pm.selectFull}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input type="text" placeholder="Search name, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} className={pm.input} />
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className={`${pm.btnSecondary} w-full text-xs py-1.5`}>
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          <div className={`${pm.card} ${pm.cardPad} flex-1 flex flex-col min-h-[200px]`}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-indigo-500" />
              <h3 className={pm.cardTitle}>List Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Showing</p>
                <p className="text-lg font-bold text-slate-900">{engagementStats.total}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Avg Score</p>
                <p className="text-lg font-bold text-indigo-600">{engagementStats.avg ?? '—'}</p>
              </div>
            </div>
            {engagementStats.total > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">Engagement mix</p>
                {[
                  { label: 'Lagging', count: engagementStats.lagging, color: 'bg-red-500' },
                  { label: 'On track', count: engagementStats.normal, color: 'bg-slate-400' },
                  { label: 'Exceptional', count: engagementStats.exceptional, color: 'bg-emerald-500' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-semibold text-slate-800">{row.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${engagementStats.total ? (row.count / engagementStats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Relationship</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 p-2 text-center">
                  <p className="text-[9px] text-blue-600 font-semibold">Father</p>
                  <p className="text-sm font-bold text-blue-800">{tabCounts.father}</p>
                </div>
                <div className="flex-1 rounded-lg bg-pink-50 border border-pink-100 p-2 text-center">
                  <p className="text-[9px] text-pink-600 font-semibold">Mother</p>
                  <p className="text-sm font-bold text-pink-800">{tabCounts.mother}</p>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-3 border-t border-slate-100 space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Quick links</p>
              {quickLinks.map((link) => (
                <button
                  key={link.page}
                  type="button"
                  onClick={() => nav(link.page)}
                  className="w-full flex items-center justify-between text-[11px] text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg px-2 py-1.5 transition-colors"
                >
                  {link.label}
                  <ArrowRight size={12} className="opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {detail?.recentActivities && detail.recentActivities.length > 0 && (
            <div className={`${pm.card} ${pm.cardPad} shrink-0`}>
              <h3 className={`${pm.cardTitle} mb-3`}>Recent Activities</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {detail.recentActivities.slice(0, 6).map((a, i) => (
                  <div key={i} className="text-[10px] pb-2 border-b border-slate-100 last:border-0">
                    <p className="font-bold text-slate-800">{a.title}</p>
                    <p className="text-slate-500">{a.desc}</p>
                    <p className="text-slate-400">{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className={pm.tableWrap}>
            <div className={pm.cardHeader}>
              <h3 className={pm.cardTitle}>Parents List</h3>
              <button type="button" onClick={() => downloadParentsExcel(parents)} className={pm.btnGhost}><Download size={14} /></button>
            </div>
            <div className={pm.tabs}>
              {([
                ['all', `All (${tabCounts.all})`],
                ['active', `Active (${tabCounts.active})`],
                ['inactive', `Inactive (${tabCounts.inactive})`],
                ['father', `Father (${tabCounts.father})`],
                ['mother', `Mother (${tabCounts.mother})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={activeTab === key ? pm.tabActive : pm.tab}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">{renderParentTable(parents)}</div>
            <div className={pm.tableFoot}>Showing {parents.length} parent contact(s)</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${pm.card} ${pm.cardPad}`}>
              <h3 className={`${pm.cardTitle} mb-3`}>Parent Engagement Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrend}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ptm" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`${pm.card} ${pm.cardPad}`}>
              <h3 className={`${pm.cardTitle} mb-3`}>Top Communication Topics</h3>
              <div className="space-y-3">
                {topicBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400">No communications yet</p>
                ) : topicBreakdown.map((t) => (
                  <div key={t.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium text-slate-700">{t.name}</span>
                      <span className="text-slate-500">{t.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className={`${pm.stickyPanel} flex-1 flex flex-col min-h-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
            {detailLoading ? (
              <ParentLoading label="Loading profile…" />
            ) : detail ? (
              <>
                <div className="text-center mb-4 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 ring-4 ring-white shadow-inner">
                    {detail.parent.name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">{detail.parent.name}</h3>
                  <p className="text-xs text-slate-500">{detail.parent.relationship} · {detail.parent.mobile}</p>
                  {detail.engagementScore && (
                    <p className={`text-xs font-bold mt-1.5 ${detail.engagementScore.tier === 'lagging' ? 'text-red-600' : detail.engagementScore.tier === 'exceptional' ? 'text-emerald-600' : 'text-slate-600'}`}>
                      Engagement: {detail.engagementScore.score}/100
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-[11px] mb-4 text-slate-700">
                  <p><span className="font-semibold text-slate-800">Email:</span> {detail.parent.email || '—'}</p>
                  <p><span className="font-semibold text-slate-800">Address:</span> {detail.profile.address || '—'}</p>
                  <p><span className="font-semibold text-slate-800">Category:</span> {detail.profile.category || 'General'}</p>
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Children</h4>
                <div className="space-y-2 mb-4">
                  {detail.children.map((c) => (
                    <div key={c.studentId} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-[10px]">
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-slate-500">{c.classGroup}</p>
                    </div>
                  ))}
                </div>
                {feesData.some((f) => f.value > 0) && (
                  <div className="h-32 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={feesData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                          {feesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-col gap-2 mt-auto">
                  <button type="button" onClick={() => { setParentProfileKey(detail.parent.parentKey); nav('Parent Profiles'); }} className={`${pm.btnDark} w-full py-2.5`}>
                    <Eye size={12} /> Full Profile
                  </button>
                  <button type="button" onClick={() => nav('Communication Log')} className={`${pm.btnSecondary} w-full py-2.5`}>
                    <PhoneCall size={12} /> Communication Log
                  </button>
                  <button type="button" onClick={() => nav('Parent Meetings (PTM)')} className={`${pm.btnSecondary} w-full py-2.5`}>
                    <CalendarIcon size={12} /> Schedule PTM
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-center pb-4 mb-4 border-b border-slate-100">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-500 mb-2">
                    <Users size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Parent overview</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Click a row in the table to open a profile, or pick from the lists below.</p>
                </div>

                {summary && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Messages', value: formatNum(summary.messagesSent) },
                      { label: 'PTM meetings', value: formatNum(summary.ptmMeetings) },
                      { label: 'Active', value: formatNum(summary.activeOpen) },
                      { label: 'Satisfaction', value: summary.satisfactionScore ? `${summary.satisfactionScore.toFixed(1)}/5` : '—' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-200/60 p-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">{item.label}</p>
                        <p className="text-sm font-bold text-slate-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {laggingParents.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={13} className="text-red-500" />
                      <h4 className="text-xs font-bold text-red-800">Needs attention</h4>
                    </div>
                    <div className="space-y-1.5">
                      {laggingParents.slice(0, 4).map((p) => (
                        <button
                          key={p.parentKey}
                          type="button"
                          onClick={() => void selectParent(p.parentKey)}
                          className="w-full text-left p-2 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-800 truncate">{p.name}</span>
                            <span className="text-[10px] font-bold text-red-600 shrink-0">{p.engagementScore ?? '—'}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate">{p.students.map((s) => s.name).join(', ')}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {exceptionalParents.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={13} className="text-emerald-500" />
                      <h4 className="text-xs font-bold text-emerald-800">Highly engaged</h4>
                    </div>
                    <div className="space-y-1.5">
                      {exceptionalParents.slice(0, 4).map((p) => (
                        <button
                          key={p.parentKey}
                          type="button"
                          onClick={() => void selectParent(p.parentKey)}
                          className="w-full text-left p-2 rounded-lg border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-800 truncate">{p.name}</span>
                            <span className="text-[10px] font-bold text-emerald-600 shrink-0">{p.engagementScore ?? '—'}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate">{p.students.map((s) => s.name).join(', ')}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {topicBreakdown.length > 0 && (
                  <div className="mt-auto pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">Top topics</h4>
                    <div className="space-y-2">
                      {topicBreakdown.slice(0, 3).map((t) => (
                        <div key={t.name}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-600 truncate">{t.name}</span>
                            <span className="text-slate-500 shrink-0 ml-2">{t.percent}%</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${t.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </ParentPageShell>
  );
}
