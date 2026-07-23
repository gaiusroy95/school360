import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Landmark,
  Loader2,
  PieChart,
  RefreshCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  accountsLedgerExportUrl,
  fetchAccountsLedger,
  fetchFeeDashboardMeta,
  formatInr,
  type AccountsLedger,
} from '../../../lib/feeFinanceServices';
import { API_URL, getToken } from '../../../lib/api';
import {
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  FeeMessage,
  FeeTabs,
} from './FeeFinanceUi';

const TABS = [
  'Financial Report',
  'Income Statement',
  'Balance Sheet',
  'Cash Flow',
] as const;

type TabId = (typeof TABS)[number];

function StatementTable({
  rows,
  currency,
}: {
  rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  currency: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              Particulars
            </th>
            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-40">
              Amount ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.label}-${idx}`}
              className={`border-b border-slate-100 ${row.bold ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'}`}
            >
              <td
                className={`px-4 py-2.5 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}
                style={{ paddingLeft: `${16 + row.level * 20}px` }}
              >
                {row.label}
              </td>
              <td
                className={`px-4 py-2.5 text-right tabular-nums ${
                  row.bold ? 'font-bold' : ''
                } ${row.amount < 0 ? 'text-red-600' : row.bold ? 'text-slate-900' : 'text-slate-700'}`}
              >
                {formatInr(Math.abs(row.amount))}
                {row.amount < 0 ? ' (Dr)' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatioCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  tone: 'green' | 'blue' | 'amber' | 'purple';
}) {
  const tones = {
    green: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function AccountsLedgerView() {
  const [data, setData] = useState<AccountsLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [activeTab, setActiveTab] = useState<TabId>('Financial Report');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meta, ledger] = await Promise.all([
        fetchFeeDashboardMeta(),
        fetchAccountsLedger({ academicYear, financialYear }),
      ]);
      const yrList = meta.academicYears?.length ? meta.academicYears : ['2025-26'];
      setYears(yrList);
      setData(ledger);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts & ledger');
    } finally {
      setLoading(false);
    }
  }, [academicYear, financialYear]);

  useEffect(() => {
    void (async () => {
      try {
        const meta = await fetchFeeDashboardMeta();
        const yrList = meta.academicYears?.length ? meta.academicYears : ['2025-26'];
        setYears(yrList);
        const year = meta.defaultAcademicYear || yrList[0] || '2025-26';
        setAcademicYear(year);
        setFinancialYear(year);
      } catch {
        /* use defaults */
      }
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.cashFlow.monthly.map((m) => ({
      month: m.month,
      Operating: m.operating,
      Investing: m.investing,
      Financing: m.financing,
      Net: m.net,
    }));
  }, [data]);

  const plChartData = useMemo(() => {
    if (!data) return [];
    const { incomeStatement: is } = data;
    return [
      { name: 'Revenue', value: is.revenue.total, fill: '#10b981' },
      { name: 'Expenses', value: is.operatingExpenses.total + is.payrollExpense.total + is.otherExpenses.total, fill: '#ef4444' },
      { name: 'Net Profit', value: Math.max(is.netProfit, 0), fill: '#3b82f6' },
    ];
  }, [data]);

  const downloadCsv = async (section: 'income' | 'balance' | 'cashflow' | 'full') => {
    setExporting(true);
    setMessage('');
    try {
      const token = getToken();
      const url = `${API_URL}${accountsLedgerExportUrl({ academicYear, financialYear, section })}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Accounts_Ledger_${section}_${academicYear}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage('Report exported successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = () => {
    if (!data) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      const incomeRows = data.incomeStatement.rows.map((r) => ({
        Particulars: ' '.repeat(r.level * 2) + r.label,
        Amount: r.amount,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), 'Income Statement');

      const balanceRows = data.balanceSheet.rows.map((r) => ({
        Particulars: ' '.repeat(r.level * 2) + r.label,
        Amount: r.amount,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balanceRows), 'Balance Sheet');

      const cashRows = data.cashFlow.rows.map((r) => ({
        Particulars: ' '.repeat(r.level * 2) + r.label,
        Amount: r.amount,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cashRows), 'Cash Flow');

      const monthlyRows = data.cashFlow.monthly.map((m) => ({
        Month: m.month,
        Operating: m.operating,
        Investing: m.investing,
        Financing: m.financing,
        Net: m.net,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly Cash Flow');

      const ratioRows = [
        { Ratio: 'Operating Margin', Value: `${data.ratios.operatingMargin}%` },
        { Ratio: 'Current Ratio (Liquidity)', Value: data.ratios.currentRatio },
        { Ratio: 'P&L Ratio (Net Margin)', Value: `${data.ratios.plRatio}%` },
        { Ratio: 'Gross Margin', Value: `${data.ratios.grossMargin}%` },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ratioRows), 'Ratios');

      XLSX.writeFile(wb, `Accounts_Ledger_${academicYear}.xlsx`);
      setMessage('Excel workbook exported');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading accounts & ledger…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Accounts & Ledger"
        title="Accounts & Ledger"
        subtitle="Income Statement, Balance Sheet, Cash Flow & Financial Ratios"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setFinancialYear(e.target.value);
              }}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  AY {y}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary} disabled={loading}>
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button type="button" onClick={downloadExcel} className={am.btnSecondary} disabled={!data || exporting}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Excel
            </button>
            <button
              type="button"
              onClick={() => void downloadCsv('full')}
              className={am.btnPrimary}
              disabled={!data || exporting}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export All
            </button>
          </div>
        }
      />

      <div className={am.content}>
      {error && <FeeMessage message={error} type="error" />}
      {message && <FeeMessage message={message} type="success" />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <RatioCard
              label="Operating Margin"
              value={`${data.ratios.operatingMargin}%`}
              sub="Operating Income ÷ Net Revenue"
              icon={data.ratios.operatingMargin >= 0 ? TrendingUp : TrendingDown}
              tone="green"
            />
            <RatioCard
              label="Liquidity Ratio (Current)"
              value={
                data.balanceSheet.liabilities.current.total > 0
                  ? `${data.ratios.currentRatio}x`
                  : 'N/A'
              }
              sub="Current Assets ÷ Current Liabilities"
              icon={Scale}
              tone="blue"
            />
            <RatioCard
              label="P&L Ratio (Net Margin)"
              value={`${data.ratios.plRatio}%`}
              sub="Net Profit ÷ Net Revenue"
              icon={PieChart}
              tone="purple"
            />
            <RatioCard
              label="Cash & Bank Balance"
              value={formatInr(data.cashFlow.closingBalance)}
              sub={`Opening: ${formatInr(data.cashFlow.openingBalance)}`}
              icon={Wallet}
              tone="amber"
            />
          </div>

          <FeeTabs tabs={[...TABS]} active={activeTab} onChange={(t) => setActiveTab(t as TabId)} />

          <div className="mt-4">
            {activeTab === 'Financial Report' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.financialReport.kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{kpi.value}</p>
                      {kpi.sub && <p className="text-xs text-slate-500">{kpi.sub}</p>}
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BarChart3 size={16} className="text-amber-600" />
                    Financial Highlights
                  </h3>
                  <ul className="space-y-2">
                    {data.financialReport.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Revenue vs Expenses</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={plChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                        <Tooltip formatter={(v: number) => formatInr(v)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Cash Flow</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                        <Tooltip formatter={(v: number) => formatInr(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Operating" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Summary Snapshot</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(data.financialReport.summary).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {typeof val === 'number' && key.toLowerCase().includes('pct')
                            ? `${val}%`
                            : typeof val === 'number' && !key.toLowerCase().includes('ratio')
                              ? formatInr(val)
                              : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Income Statement' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Landmark size={16} className="text-amber-600" />
                    <span>
                      Profit & Loss for Academic Year <strong>{data.academicYear}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadCsv('income')}
                    className={am.btnSecondary}
                    disabled={exporting}
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
                <StatementTable rows={data.incomeStatement.rows} currency={data.currency} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-emerald-700 font-medium">Net Revenue</p>
                    <p className="text-xl font-bold text-emerald-900">{formatInr(data.incomeStatement.netRevenue)}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-amber-700 font-medium">Operating Income</p>
                    <p className="text-xl font-bold text-amber-900">{formatInr(data.incomeStatement.operatingIncome)}</p>
                  </div>
                  <div
                    className={`border rounded-lg p-4 text-center ${
                      data.incomeStatement.netProfit >= 0
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        data.incomeStatement.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'
                      }`}
                    >
                      Net Profit / (Loss)
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        data.incomeStatement.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'
                      }`}
                    >
                      {formatInr(data.incomeStatement.netProfit)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Balance Sheet' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Scale size={16} className="text-amber-600" />
                    <span>
                      Balance Sheet as of{' '}
                      <strong>{new Date(data.asOf).toLocaleDateString('en-IN')}</strong>
                      {data.balanceSheet.balanced && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">
                          Balanced
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadCsv('balance')}
                    className={am.btnSecondary}
                    disabled={exporting}
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
                <StatementTable rows={data.balanceSheet.rows} currency={data.currency} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">Total Assets</p>
                    <p className="text-xl font-bold text-slate-900">{formatInr(data.balanceSheet.assets.total)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">Total Liabilities</p>
                    <p className="text-xl font-bold text-slate-900">{formatInr(data.balanceSheet.liabilities.total)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">Total Equity</p>
                    <p className="text-xl font-bold text-slate-900">{formatInr(data.balanceSheet.equity.total)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Cash Flow' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Wallet size={16} className="text-amber-600" />
                    <span>Cash Flow Statement — AY {data.academicYear}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadCsv('cashflow')}
                    className={am.btnSecondary}
                    disabled={exporting}
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
                <StatementTable rows={data.cashFlow.rows} currency={data.currency} />
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Cash Flow Trend</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v: number) => formatInr(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Operating" stackId="a" fill="#10b981" />
                      <Bar dataKey="Investing" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Financing" stackId="a" fill="#ef4444" />
                      <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </AcademicPageShell>
  );
}
