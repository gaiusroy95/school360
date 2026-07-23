import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndianRupee, AlertCircle, Clock, Percent, PercentSquare,
  FileText, PlusCircle, XCircle, CreditCard, Receipt,
  Bell, Mail, MessageSquare, Download, Calendar,
  ArrowDownRight, BarChart2, RefreshCcw, HandCoins,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  BarChart, Bar, ComposedChart,
} from 'recharts';
import { SubModuleView } from './shared/SubModuleView';
import { FeeMastersView } from './FeeFinanceManagement/FeeMastersView';
import { FeeStructureView } from './FeeFinanceManagement/FeeStructureView';
import { FeeCollectionView as FinanceFeeCollectionView } from './FeeFinanceManagement/FeeCollectionView';
import { OnlinePaymentsView } from './FeeFinanceManagement/OnlinePaymentsView';
import { BankCashBookView } from './FeeFinanceManagement/BankCashBookView';
import { ExpenseManagementView } from './FeeFinanceManagement/ExpenseManagementView';
import { PaymentReconciliationView } from './FeeFinanceManagement/PaymentReconciliationView';
import { InvoicesView } from './FeeFinanceManagement/InvoicesView';
import { DiscountsConcessionsView } from './FeeFinanceManagement/DiscountsConcessionsView';
import { RefundsView } from './FeeFinanceManagement/RefundsView';
import { FinePenaltiesView } from './FeeFinanceManagement/FinePenaltiesView';
import { ScholarshipView } from './FeeFinanceManagement/ScholarshipView';
import { TransportFeeView } from './FeeFinanceManagement/TransportFeeView';
import { HostelFeeView } from './FeeFinanceManagement/HostelFeeView';
import { OtherChargesView } from './FeeFinanceManagement/OtherChargesView';
import { PayrollView } from './FeeFinanceManagement/PayrollView';
import { FinancialReportsView } from './FeeFinanceManagement/FinancialReportsView';
import { AccountsLedgerView } from './FeeFinanceManagement/AccountsLedgerView';
import {
  fetchFeeDashboard,
  fetchFeeDashboardMeta,
  formatInr,
  formatTrend,
  type FeeDashboard,
  type FeeDashboardMeta,
} from '../../lib/feeFinanceServices';
import { toViewKey } from '../../lib/navigation';

const FEE_MODULE = 'Fees & Finance';

const quickActions = [
  { label: 'Create Invoice', page: 'Invoices', icon: <PlusCircle size={16} className="text-blue-600" /> },
  { label: 'Receive Payment', page: 'Fee Collection', icon: <HandCoins size={16} className="text-green-600" /> },
  { label: 'Online Collection', page: 'Online Payments', icon: <CreditCard size={16} className="text-purple-600" /> },
  { label: 'Fee Receipt', page: 'Fee Collection', icon: <Receipt size={16} className="text-blue-600" /> },
  { label: 'Add Discount', page: 'Discounts & Concessions', icon: <Percent size={16} className="text-orange-600" /> },
  { label: 'Waive Off', page: 'Fine / Penalties', icon: <XCircle size={16} className="text-red-600" /> },
  { label: 'Generate Statement', page: 'Financial Reports', icon: <FileText size={16} className="text-teal-600" /> },
  { label: 'Payment Reconcile', page: 'Payment Reconciliation', icon: <RefreshCcw size={16} className="text-indigo-600" /> },
  { label: 'Fee Reminder', page: 'Fee Collection', icon: <Bell size={16} className="text-yellow-600" /> },
  { label: 'Send SMS / Email', page: 'Fee Collection', icon: <Mail size={16} className="text-blue-600" /> },
  { label: 'Refund Request', page: 'Refunds', icon: <ArrowDownRight size={16} className="text-red-600" /> },
  { label: 'Reports', page: 'Financial Reports', icon: <BarChart2 size={16} className="text-slate-600" /> },
];

function formatTxnTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function asOfLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function FeeDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const nav = useCallback(
    (page: string) => onNavigate?.(toViewKey(FEE_MODULE, page)),
    [onNavigate],
  );

  const [meta, setMeta] = useState<FeeDashboardMeta | null>(null);
  const [data, setData] = useState<FeeDashboard | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [overviewPeriod, setOverviewPeriod] = useState<'month' | 'year' | 'academic'>('month');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [m, d] = await Promise.all([
        fetchFeeDashboardMeta(),
        fetchFeeDashboard({ academicYear, financialYear, overviewPeriod }),
      ]);
      setMeta(m);
      setData(d);
      if (!academicYear && m.defaultAcademicYear) {
        setAcademicYear(m.defaultAcademicYear);
        setFinancialYear(m.defaultAcademicYear);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load fee dashboard');
    } finally {
      setLoading(false);
    }
  }, [academicYear, financialYear, overviewPeriod]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!data) return [] as Array<{
      title: string;
      value: string;
      subtitle: string;
      trend?: string;
      trendColor?: string;
      icon: React.ReactNode;
      color: string;
      iconColor: string;
      iconBg: string;
      page?: string;
    }>;
    const collectionTrend = formatTrend(data.kpis.collectionTrendPct);
    const pendingTrend = formatTrend(data.kpis.pendingTrendPct);
    return [
      {
        title: 'Total Fee Due',
        value: formatInr(data.kpis.totalFeeDue),
        subtitle: 'This Academic Year',
        icon: <IndianRupee size={20} />,
        color: 'bg-blue-500',
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
        page: 'Fee Structure',
      },
      {
        title: 'Total Collection',
        value: formatInr(data.kpis.totalCollection),
        subtitle: 'This Academic Year',
        trend: collectionTrend || undefined,
        trendColor: (data.kpis.collectionTrendPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
        icon: <HandCoins size={20} />,
        color: 'bg-green-500',
        iconColor: 'text-green-500',
        iconBg: 'bg-green-100',
        page: 'Fee Collection',
      },
      {
        title: 'Pending Amount',
        value: formatInr(data.kpis.pendingAmount),
        subtitle: 'This Academic Year',
        trend: pendingTrend || undefined,
        trendColor: (data.kpis.pendingTrendPct ?? 0) >= 0 ? 'text-orange-600' : 'text-green-600',
        icon: <AlertCircle size={20} />,
        color: 'bg-orange-500',
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
        page: 'Fee Collection',
      },
      {
        title: 'Collection %',
        value: `${data.kpis.collectionPct.toFixed(2)}%`,
        subtitle: `${data.kpis.receiptCount} receipts · ${data.kpis.studentCount} students`,
        icon: <Percent size={20} />,
        color: 'bg-purple-500',
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-100',
        page: 'Financial Reports',
      },
    ];
  }, [data]);

  const years = meta?.academicYears?.length ? meta.academicYears : [academicYear];
  const fyYears = meta?.financialYears?.length ? meta.financialYears : years;
  const dueMax = data
    ? Math.max(...data.dueVsCollection.map((d) => d.value), 0.1)
    : 1;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[1px] rounded-xl transition-all">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Fee & Finance Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Collect • Manage • Reconcile • Analyze • Report</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Academic Year</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Financial Year</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              {fyYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-2 rounded flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCcw size={12} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => nav('Invoices')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <PlusCircle size={14} />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      {!data?.feeConfigured && data && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          Fee structure is not configured yet. Set class-wise amounts under Institution Setup → Fee Group Setup so Total Fee Due can be calculated from enrolled students.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(kpis.length ? kpis : Array.from({ length: 4 }, (_, i) => null)).map((kpi, i) => (
          <button
            key={i}
            type="button"
            onClick={() => kpi?.page && nav(kpi.page)}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-amber-200 transition-all relative overflow-hidden group text-left"
          >
            {kpi ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                    {kpi.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
                    <p className="text-lg font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
                  </div>
                </div>
                {kpi.subtitle && (
                  <div className="text-[9px] text-slate-500 flex flex-col">
                    <span className="truncate">{kpi.subtitle}</span>
                    {kpi.trend && <span className={`font-bold ${kpi.trendColor}`}>{kpi.trend}</span>}
                  </div>
                )}
                <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
              </>
            ) : (
              <div className="h-16 animate-pulse bg-slate-100 rounded" />
            )}
          </button>
        ))}
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button type="button" onClick={() => nav('Fee Collection')} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-left hover:border-orange-200">
            <p className="text-[9px] text-slate-500">Overdue Amount</p>
            <p className="text-sm font-bold text-orange-700">{formatInr(data.kpis.overdueAmount)}</p>
          </button>
          <button type="button" onClick={() => nav('Discounts & Concessions')} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-left hover:border-red-200">
            <p className="text-[9px] text-slate-500">Total Discounts</p>
            <p className="text-sm font-bold text-red-700">{formatInr(data.kpis.totalDiscounts)}</p>
          </button>
          <button type="button" onClick={() => nav('Expense Management')} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-left hover:border-indigo-200">
            <p className="text-[9px] text-slate-500">Total Expenses</p>
            <p className="text-sm font-bold text-indigo-700">{formatInr(data.expenseSummary.total)}</p>
          </button>
          <button type="button" onClick={() => nav('Payment Reconciliation')} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-left hover:border-teal-200">
            <p className="text-[9px] text-slate-500">Net Cash Flow</p>
            <p className={`text-sm font-bold ${data.cashFlow.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatInr(data.cashFlow.netCashFlow)}
            </p>
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Overview</h3>
                <select
                  value={overviewPeriod}
                  onChange={(e) => setOverviewPeriod(e.target.value as typeof overviewPeriod)}
                  className="text-[9px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-600"
                >
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="academic">This Academic Year</option>
                </select>
              </div>
              <div className="flex items-center justify-center gap-4 flex-1">
                <div className="w-28 h-28 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.collectionOverview.items.length ? data.collectionOverview.items : [{ name: 'No data', value: 1, color: '#e2e8f0' }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {(data.collectionOverview.items.length ? data.collectionOverview.items : [{ color: '#e2e8f0' }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] text-slate-500 font-medium">Total Collection</span>
                    <span className="text-[10px] font-bold text-slate-800">{formatInr(data.collectionOverview.total, { compact: true })}</span>
                    <span className="text-[7px] text-slate-500">{data.collectionOverview.period}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[9px] flex-1">
                  {data.collectionOverview.items.length === 0 ? (
                    <p className="text-slate-400">No collections for selected period</p>
                  ) : (
                    data.collectionOverview.items.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => nav('Fee Collection')}
                        className="flex items-center justify-between hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600 text-[9px] font-medium">{item.name}</span>
                        </div>
                        <span className="text-slate-500 text-[9px]">{item.value}%</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col relative">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[11px] font-bold text-slate-800">Collection Trend</h3>
                <span className="text-[9px] text-slate-500">{academicYear}</span>
              </div>
              <div className="flex-1 w-full h-full min-h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.collectionTrend} margin={{ top: 20, right: -15, left: -25, bottom: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val}L`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -5 }} />
                    <Line yAxisId="left" type="monotone" dataKey="collection" name="Collection (₹ L)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="percentage" name="Collection %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Fee Due vs Collection</h3>
              </div>
              <div className="flex-1 w-full h-full min-h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dueVsCollection} margin={{ top: 15, right: 0, left: -30, bottom: -10 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val} Cr`} domain={[0, Math.ceil(dueMax * 1.2) || 1]} />
                    <RechartsTooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }}
                      formatter={(val: number, _n, props) => [
                        formatInr((props?.payload as { amount?: number })?.amount ?? val * 10000000),
                        'Amount',
                      ]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.dueVsCollection.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => nav(action.page)}
                  className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-amber-200 transition-colors group"
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 xl:col-span-5 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Fee Installment Summary</h3>
                <span className="text-[9px] text-slate-500">{academicYear}</span>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Installment</th>
                      <th className="pb-2 font-medium text-right">Total Due</th>
                      <th className="pb-2 font-medium text-right">Collected</th>
                      <th className="pb-2 font-medium text-right">Pending</th>
                      <th className="pb-2 font-medium text-center">% Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.installments.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 text-slate-700">{row.name}</td>
                        <td className="py-2.5 text-right font-medium text-slate-800">{formatInr(row.due)}</td>
                        <td className="py-2.5 text-right font-medium text-green-600">{formatInr(row.collected)}</td>
                        <td className="py-2.5 text-right font-medium text-orange-600">{formatInr(row.pending)}</td>
                        <td className="py-2.5 flex items-center justify-center">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${row.progress > 80 ? 'bg-green-500' : row.progress > 50 ? 'bg-blue-500' : 'bg-orange-500'} rounded-full`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                      <td className="py-2.5">Total</td>
                      <td className="py-2.5 text-right">{formatInr(data.installments.totals.due)}</td>
                      <td className="py-2.5 text-right text-green-600">{formatInr(data.installments.totals.collected)}</td>
                      <td className="py-2.5 text-right text-orange-600">{formatInr(data.installments.totals.pending)}</td>
                      <td className="py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Top Dues (Students)</h3>
                <button
                  type="button"
                  onClick={() => nav('Fee Collection')}
                  className="text-[9px] font-bold text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto flex-1 flex flex-col">
                <table className="w-full text-[9px] text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-50">
                      <th className="pb-2 font-medium">Student Name</th>
                      <th className="pb-2 font-medium">Class</th>
                      <th className="pb-2 font-medium text-right">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.topDues.rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">No outstanding dues</td>
                      </tr>
                    ) : (
                      data.topDues.rows.map((row) => (
                        <tr key={row.studentId}>
                          <td className="py-2 text-blue-600 font-medium">{row.name}</td>
                          <td className="py-2 text-slate-600">{row.class}</td>
                          <td className="py-2 text-right font-bold text-slate-800">{formatInr(row.due)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
                  <span className="text-[10px] text-slate-700">Total Overdue</span>
                  <span className="text-[11px] text-slate-900">{formatInr(data.topDues.totalOverdue)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Mode</h3>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-32 h-32 relative shrink-0 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.collectionModes.items.length ? data.collectionModes.items : [{ name: 'No data', value: 1, color: '#e2e8f0' }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {(data.collectionModes.items.length ? data.collectionModes.items : [{ color: '#e2e8f0' }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] text-slate-500 font-medium">Total Collection</span>
                    <span className="text-[10px] font-bold text-slate-800">{formatInr(data.collectionModes.total, { compact: true })}</span>
                  </div>
                </div>
                <div className="w-full flex flex-col gap-1.5 text-[9px] px-2">
                  {data.collectionModes.items.length === 0 ? (
                    <p className="text-center text-slate-400">No payments yet</p>
                  ) : (
                    data.collectionModes.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 font-medium">{item.name}</span>
                        </div>
                        <span className="text-slate-500">{item.value}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Recent Transactions</h3>
              </div>
              <div className="flex-1 flex flex-col gap-3.5 overflow-hidden">
                {data.recentTransactions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6">No fee receipts yet</p>
                ) : (
                  data.recentTransactions.map((t) => (
                    <div key={t.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-green-100">
                        <HandCoins size={14} className="text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-[9px] font-bold text-slate-800 leading-tight mb-0.5">{t.title}</p>
                          <p className="text-[9px] font-bold text-slate-900">{formatInr(t.amount)}</p>
                        </div>
                        <p className="text-[8px] text-slate-600 leading-snug truncate">{t.desc}</p>
                        <div className="flex justify-between items-center mt-0.5">
                          <p className="text-[7px] text-slate-400">{formatTxnTime(t.time)}</p>
                          {t.type && <span className="text-[7px] bg-slate-100 text-slate-500 px-1 rounded">{t.type}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-800 mb-4">Fee Reminder & Notifications</h3>
              <div className="grid grid-cols-4 gap-2 flex-1 mb-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center mb-2"><FileText size={14} /></div>
                  <span className="text-[7px] text-slate-500 font-medium mb-1">Reminders Sent</span>
                  <span className="text-sm font-bold text-slate-900 mb-1">{data.reminders.remindersSent.toLocaleString('en-IN')}</span>
                  <span className="text-[7px] text-slate-400">Last 30 Days</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded border border-green-100 bg-green-50 text-green-600 flex items-center justify-center mb-2"><MessageSquare size={14} /></div>
                  <span className="text-[7px] text-slate-500 font-medium mb-1">SMS Sent</span>
                  <span className="text-sm font-bold text-slate-900 mb-1">{data.reminders.smsSent.toLocaleString('en-IN')}</span>
                  <span className="text-[7px] text-slate-400">Last 30 Days</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Mail size={14} /></div>
                  <span className="text-[7px] text-slate-500 font-medium mb-1">Email Sent</span>
                  <span className="text-sm font-bold text-slate-900 mb-1">{data.reminders.emailSent.toLocaleString('en-IN')}</span>
                  <span className="text-[7px] text-slate-400">Last 30 Days</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded border border-orange-100 bg-orange-50 text-orange-600 flex items-center justify-center mb-2"><Calendar size={14} /></div>
                  <span className="text-[7px] text-slate-500 font-medium mb-1">Due in Next 7 Days</span>
                  <span className="text-[11px] font-bold text-slate-900 mb-1">{formatInr(data.reminders.dueInNext7Days, { compact: true })}</span>
                  <span className="text-[7px] text-slate-400">From {data.reminders.dueInNext7Students} Students</span>
                </div>
              </div>
              <button type="button" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 rounded transition-colors mt-auto">
                Send Fee Reminders
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Cash Flow Overview</h3>
                <span className="text-[9px] text-slate-500">{academicYear}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-slate-100 rounded-lg p-2 text-center">
                  <span className="text-[8px] text-slate-500 mb-1 block">Total Inflow</span>
                  <span className="text-[11px] font-bold text-slate-900">{formatInr(data.cashFlow.totalInflow)}</span>
                </div>
                <div className="border border-slate-100 rounded-lg p-2 text-center">
                  <span className="text-[8px] text-slate-500 mb-1 block">Total Outflow</span>
                  <span className="text-[11px] font-bold text-slate-900">{formatInr(data.cashFlow.totalOutflow)}</span>
                </div>
                <div className={`border rounded-lg p-2 text-center ${data.cashFlow.netCashFlow >= 0 ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                  <span className="text-[8px] text-slate-600 mb-1 block">Net Cash Flow</span>
                  <span className={`text-[11px] font-bold ${data.cashFlow.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatInr(data.cashFlow.netCashFlow)}
                  </span>
                  <span className={`text-[7px] block ${data.cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({data.cashFlow.netCashFlow >= 0 ? 'Surplus' : 'Deficit'})
                  </span>
                </div>
              </div>
              <div className="flex-1 w-full h-full min-h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.cashFlow.months} margin={{ top: 5, right: 5, left: -30, bottom: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                    <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -15 }} />
                    <Line type="monotone" dataKey="inflow" name="Inflow (Cr)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="outflow" name="Outflow (Cr)" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col cursor-pointer hover:border-indigo-200" onClick={() => nav('Expense Management')} role="presentation">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Expense Summary</h3>
                <span className="text-[9px] text-blue-600 font-semibold">View All →</span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                {data.expenseSummary.rows.length === 0 ? (
                  <p className="text-[10px] text-slate-400 py-4">{data.expenseSummary.note || 'No expense data yet'}</p>
                ) : (
                  <table className="w-full text-[9px] text-left">
                    <tbody className="divide-y divide-slate-50">
                      {data.expenseSummary.rows.map((row, i) => (
                        <tr key={i}>
                          <td className="py-2 text-slate-700 font-medium">{row.name}</td>
                          <td className="py-2 text-right font-medium text-slate-900">{formatInr(row.amount)}</td>
                          <td className="py-2 text-right text-slate-500 w-12">{row.percent.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-2 pt-3 border-t border-slate-200 flex justify-between items-center font-bold">
                  <span className="text-[10px] text-slate-800">Total Expenses</span>
                  <span className="text-[11px] text-slate-900">{formatInr(data.expenseSummary.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-800 mb-3">Reports</h3>
              <div className="flex-1 flex flex-col gap-2">
                {data.reports.map((report, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => nav('Financial Reports')}
                    className="flex justify-between items-center p-1.5 hover:bg-slate-50 rounded transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-slate-400 group-hover:text-blue-500" />
                      <span className="text-[9px] text-slate-700 group-hover:text-blue-700 font-medium truncate">{report}</span>
                    </div>
                    <Download size={12} className="text-slate-300 group-hover:text-blue-600" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => nav('Financial Reports')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] py-1.5 rounded transition-colors mt-auto"
              >
                View All Reports
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FeeFinanceManagementCRM({
  currentView = 'Fee Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Fee Dashboard') return <FeeDashboardView onNavigate={onNavigate} />;
  if (currentView === 'Fee Masters') return <FeeMastersView />;
  if (currentView === 'Fee Structure') return <FeeStructureView />;
  if (currentView === 'Fee Collection') return <FinanceFeeCollectionView />;
  if (currentView === 'Online Payments') return <OnlinePaymentsView />;
  if (currentView === 'Payment Reconciliation') return <PaymentReconciliationView />;
  if (currentView === 'Bank & Cash Book') return <BankCashBookView />;
  if (currentView === 'Expense Management') return <ExpenseManagementView />;
  if (currentView === 'Invoices') return <InvoicesView />;
  if (currentView === 'Discounts & Concessions') return <DiscountsConcessionsView />;
  if (currentView === 'Refunds') return <RefundsView />;
  if (currentView === 'Fine / Penalties') return <FinePenaltiesView />;
  if (currentView === 'Scholarship') return <ScholarshipView />;
  if (currentView === 'Transport Fee') return <TransportFeeView />;
  if (currentView === 'Hostel Fee') return <HostelFeeView />;
  if (currentView === 'Other Charges') return <OtherChargesView />;
  if (currentView === 'Payroll') return <PayrollView />;
  if (currentView === 'Accounts & Ledger') return <AccountsLedgerView />;
  if (currentView === 'Financial Reports') return <FinancialReportsView />;
  return <SubModuleView module="Fees & Finance" title={currentView} />;
}
