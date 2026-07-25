import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  MessageSquare, Users, MessageCircle, Mail, Bell, FileText,
  RefreshCw, Plus, Send, Smartphone, TrendingUp, BarChart2,
  AlertTriangle, Shield, Lock,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { fetchCommunicationDashboard, type CommunicationDashboard } from '../../../lib/communicationServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_META = [
  { key: 'totalMessagesSent' as const, title: 'Total Messages Sent', color: 'bg-blue-500', icon: <MessageSquare size={20} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  { key: 'totalRecipients' as const, title: 'Total Recipients', color: 'bg-green-500', icon: <Users size={20} />, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  { key: 'smsSent' as const, title: 'SMS Sent', color: 'bg-purple-500', icon: <Send size={20} />, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
  { key: 'emailSent' as const, title: 'Email Sent', color: 'bg-orange-500', icon: <Mail size={20} />, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { key: 'whatsappSent' as const, title: 'WhatsApp Sent', color: 'bg-emerald-500', icon: <MessageCircle size={20} />, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500' },
  { key: 'pushSent' as const, title: 'Push Notifications', color: 'bg-red-500', icon: <Bell size={20} />, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
];

const QUICK_ICONS: Record<string, ReactNode> = {
  'Send SMS': <Smartphone size={24} className="text-blue-600" />,
  'Send Email': <Mail size={24} className="text-green-600" />,
  'Send WhatsApp': <MessageCircle size={24} className="text-emerald-600" />,
  'Push Notification': <Bell size={24} className="text-amber-600" />,
  'Create Circular': <FileText size={24} className="text-purple-600" />,
};

const CHANNEL_ICON: Record<string, ReactNode> = {
  SMS: <MessageSquare size={14} className="text-white" />,
  Email: <Mail size={14} className="text-white" />,
  WhatsApp: <MessageCircle size={14} className="text-white" />,
  Push: <Bell size={14} className="text-white" />,
};

const TPL_COLORS: Record<string, string> = {
  SMS: 'text-green-600 bg-green-50 border-green-200',
  Email: 'text-blue-600 bg-blue-50 border-blue-200',
  WhatsApp: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const ROLE_OPTIONS = ['Principal', 'Super Admin', 'Teacher', 'Class Teacher', 'Marketing/Admission Team', 'Communication Manager'];

export function CommunicationDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<CommunicationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [channel, setChannel] = useState('ALL');
  const [userRole, setUserRole] = useState('Principal');
  const [perfTab, setPerfTab] = useState('Total Sent');
  const [message, setMessage] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCommunicationDashboard(seed, academicYear, { channel, role: userRole });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, channel, userRole]);

  useEffect(() => { void load(true); }, [load]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Communication Management', target));
  };

  const kpiList = useMemo(() => {
    if (!data) return [];
    return KPI_META.map((m) => ({
      ...m,
      value: data.kpis[m.key].value.toLocaleString('en-IN'),
      subtitle: data.kpis[m.key].subtitle,
    }));
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return data.channelPerformance.map((c) => {
      let value = c.sent;
      if (perfTab === 'Delivered') value = c.delivered;
      if (perfTab === 'Read') value = c.read;
      if (perfTab === 'Failed') value = c.failed;
      return { name: c.name, value, color: c.color };
    });
  }, [data, perfTab]);

  if (loading && !data) return <AcademicLoading label="Loading communication dashboard…" />;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Communication Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time command center — SMS, Email, WhatsApp &amp; Push</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white">
            {(data?.channels ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)} title="RBAC scope"
            className="text-xs border border-slate-200 rounded px-3 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => nav('Compose Message')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2">
            <Plus size={14} /> Create New Message
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type="info" />}

      {data?.piiMasked && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <Lock className="w-4 h-4" /> PII masked in previews — scope: <strong>{data.scopeKey}</strong>
        </div>
      )}

      {(data?.gatewayAlerts?.length ?? 0) > 0 && (
        <div className="space-y-1">
          {data!.gatewayAlerts.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <strong>{a.channel}:</strong> {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiList.map((kpi) => (
          <div key={kpi.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
            </div>
            <div className="text-[8px] font-bold text-green-600">{kpi.subtitle}</div>
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Message Delivery Overview</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.deliveryOverview ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.deliveryOverview ?? []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-bold text-slate-800">{(data?.kpis.totalMessagesSent.value ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-[6px] text-slate-500">Total Sent</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.deliveryOverview ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="font-bold text-slate-800">{item.value.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div>
              <span className="text-[8px] text-slate-500 block font-medium">Delivery Rate</span>
              <span className="text-[12px] font-bold text-green-600">{data?.rates.deliveryRate}%</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block font-medium">Read Rate</span>
              <span className="text-[12px] font-bold text-blue-600">{data?.rates.readRate}%</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block font-medium">Failure Rate</span>
              <span className="text-[12px] font-bold text-red-500">{data?.rates.failureRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-1">Channel Wise Performance</h3>
          <div className="flex gap-2 border-b border-slate-100 pb-2 mb-2 mt-2">
            {['Total Sent', 'Delivered', 'Read', 'Failed'].map((tab) => (
              <button key={tab} type="button" onClick={() => setPerfTab(tab)}
                className={`text-[9px] font-bold py-1 px-3 rounded-full ${perfTab === tab ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 15, right: 0, left: -20, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : v} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Communications</h3>
            <button type="button" onClick={() => nav('Message History')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[220px]">
            {(data?.recentCommunications ?? []).map((comm) => (
              <div key={comm.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${comm.iconBg}`}>
                  {CHANNEL_ICON[comm.channel] ?? <MessageSquare size={14} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <p className="text-[9px] font-bold text-slate-800">{comm.title}</p>
                    <span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">{comm.status}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 mt-0.5 truncate">{comm.description}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[7px] text-slate-400">{comm.channel} · {comm.sourceModule}</span>
                    <span className="text-[7px] text-slate-400">{comm.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Compose</h3>
          <div className="grid grid-cols-3 gap-2">
            {(data?.quickActions ?? []).map((action) => (
              <button key={action.label} type="button" onClick={() => nav(action.target)}
                className="flex flex-col items-center p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="mb-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100">
                  {QUICK_ICONS[action.label]}
                </div>
                <span className="text-[7.5px] font-bold text-slate-700 text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Message Templates</h3>
            <button type="button" onClick={() => nav('Message Templates')} className="text-[9px] text-blue-600 hover:underline">View All</button>
          </div>
          <div className="flex flex-col gap-3">
            {(data?.templates ?? []).map((tpl) => (
              <div key={tpl.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  <span className="text-[9px] font-medium text-slate-700">{tpl.name}</span>
                </div>
                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded border ${TPL_COLORS[tpl.type] ?? 'text-slate-600 bg-slate-50'}`}>{tpl.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Automation &amp; Reminders</h3>
          <div className="flex flex-col gap-3">
            {(data?.automations ?? []).map((auto) => (
              <div key={auto.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${auto.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="text-[9px] font-medium text-slate-700 truncate">{auto.name}</span>
                </div>
                <span className="text-[7px] text-slate-400 shrink-0">{auto.sourceModule}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Recipient Groups</h3>
          <div className="flex flex-col gap-3">
            {(data?.recipientGroups ?? []).map((g) => (
              <div key={g.id} className="flex items-center justify-between">
                <span className="text-[9px] font-medium text-slate-700">{g.name}</span>
                <span className="text-[9px] font-bold text-slate-900">{g.count.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Scheduled Messages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[8px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 text-left font-medium">Title</th>
                  <th className="pb-2 text-left font-medium">Channel</th>
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Time</th>
                  <th className="pb-2 text-right font-medium">Recipients</th>
                  <th className="pb-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.scheduledMessages ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-800 truncate max-w-[100px]">{row.title}</td>
                    <td className="py-2 text-slate-600">{row.channel}</td>
                    <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                    <td className="py-2 text-slate-600">{row.time}</td>
                    <td className="py-2 text-right font-bold">{row.recipients}</td>
                    <td className="py-2 text-center">
                      <span className="text-[7px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Feedback &amp; Surveys</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
              <span className="text-[7px] text-slate-500 block">Active</span>
              <span className="text-[14px] font-bold text-blue-600">{data?.surveys.activeSurveys}</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
              <span className="text-[7px] text-slate-500 block">Responses</span>
              <span className="text-[14px] font-bold">{data?.surveys.totalResponses.toLocaleString('en-IN')}</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
              <span className="text-[7px] text-slate-500 block">Rate</span>
              <span className="text-[14px] font-bold">{data?.surveys.responseRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-800">{data?.surveys.recentSurvey.name}</p>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${data?.surveys.recentSurvey.percent}%` }} />
            </div>
            <p className="text-[7px] text-slate-500 mt-1 text-right">{data?.surveys.recentSurvey.percent}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Communication Analytics</h3>
          <div className="grid grid-cols-4 gap-2 mb-2 text-center">
            <div>
              <span className="text-[7px] text-slate-500 block">Engagement</span>
              <span className="text-[12px] font-bold">{data?.rates.engagementRate}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 block">Open Rate</span>
              <span className="text-[12px] font-bold">{data?.rates.openRate}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 block">Click Rate</span>
              <span className="text-[12px] font-bold">{data?.rates.clickRate}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 block">Reply Rate</span>
              <span className="text-[12px] font-bold">{data?.rates.replyRate}%</span>
            </div>
          </div>
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trendData ?? []} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 7 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7 }} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="rate" stroke="#3b82f6" fill="url(#engGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {(data?.keyBenefits ?? []).map((b) => (
          <div key={b.title} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-800 truncate">{b.title}</p>
              <p className="text-[7px] text-slate-500 truncate">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <Shield className="w-3.5 h-3.5" />
        <span>{data?.liveUpdatesNote}</span>
        {data?.canViewCosts && data.kpis.totalCost.value !== '***' && (
          <span className="ml-auto font-semibold text-slate-700">Total channel cost: {data.kpis.totalCost.value}</span>
        )}
      </div>
    </div>
  );
}
