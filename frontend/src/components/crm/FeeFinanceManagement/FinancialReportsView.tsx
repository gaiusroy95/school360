import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, RefreshCcw } from 'lucide-react';
import {
  fetchAllFinancialReports,
  fetchFeeDashboardMeta,
  fetchFinancialReport,
  fetchFinancialReportsMeta,
  type FinancialReportCatalogItem,
  type FinancialReportPayload,
  type FinancialReportType,
} from '../../../lib/feeFinanceServices';
import {
  downloadAllFinancialReportsExcel,
  downloadFinancialReportExcel,
} from '../../../lib/financialReportExcel';
import { API_URL, getToken } from '../../../lib/api';
import {
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  FeeMessage,
} from './FeeFinanceUi';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function currentPayPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PAYROLL_REPORTS = new Set<FinancialReportType>(['payroll', 'epf-esic']);

export function FinancialReportsView() {
  const [catalog, setCatalog] = useState<FinancialReportCatalogItem[]>([]);
  const [activeType, setActiveType] = useState<FinancialReportType>('overview');
  const [report, setReport] = useState<FinancialReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [payPeriod, setPayPeriod] = useState(currentPayPeriod());
  const [years, setYears] = useState<string[]>(['2025-26']);

  const activeMeta = useMemo(
    () => catalog.find((c) => c.id === activeType) || catalog[0],
    [catalog, activeType],
  );

  const needsPayPeriod = PAYROLL_REPORTS.has(activeType);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meta, reportsMeta] = await Promise.all([
        fetchFeeDashboardMeta(),
        fetchFinancialReportsMeta(),
      ]);
      const yrList = meta.academicYears?.length ? meta.academicYears : ['2025-26'];
      setYears(yrList);
      const year = meta.defaultAcademicYear || yrList[0] || '2025-26';
      setAcademicYear(year);
      setFinancialYear(year);
      setCatalog(reportsMeta.reports);
      if (reportsMeta.reports[0]) setActiveType(reportsMeta.reports[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async (type: FinancialReportType, year: string, finYear: string, period: string) => {
      setReportLoading(true);
      setError('');
      try {
        const data = await fetchFinancialReport(type, {
          academicYear: year,
          financialYear: finYear,
          payPeriod: PAYROLL_REPORTS.has(type) ? period : undefined,
        });
        setReport(data);
      } catch (e) {
        setReport(null);
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setReportLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (loading || !catalog.length) return;
    void loadReport(activeType, academicYear, financialYear, payPeriod);
  }, [loading, catalog.length, activeType, academicYear, financialYear, payPeriod, loadReport]);

  const handleDownloadCurrent = async () => {
    setDownloading(true);
    setError('');
    try {
      const data =
        report?.reportType === activeType
          ? report
          : await fetchFinancialReport(activeType, {
              academicYear,
              financialYear,
              payPeriod: needsPayPeriod ? payPeriod : undefined,
            });
      downloadFinancialReportExcel(data);
      setReport(data);
      setMessage(`Downloaded ${data.reportTitle}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excel download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setError('');
    try {
      const pack = await fetchAllFinancialReports({
        academicYear,
        financialYear,
        payPeriod,
      });
      downloadAllFinancialReportsExcel(pack);
      setMessage(`Downloaded all ${pack.reportCount} financial reports`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download all reports');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setError('');
    try {
      if (!API_URL) throw new Error('API URL is not configured');
      const params = new URLSearchParams({
        academicYear,
        financialYear,
        format: 'csv',
      });
      if (needsPayPeriod) params.set('payPeriod', payPeriod);
      const headers = new Headers();
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(`${API_URL}/api/fee-finance/reports/${activeType}?${params}`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'CSV download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Financial_${activeType.replace(/-/g, '_')}_${academicYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage('CSV downloaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <AcademicLoading label="Loading financial reports…" />;

  const summaryEntries = Object.entries(report?.summary || {}).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== 'object',
  );
  const nestedSummary = Object.entries(report?.summary || {}).filter(
    ([, v]) => v && typeof v === 'object' && !Array.isArray(v),
  );
  const columns = report?.columns?.length
    ? report.columns
    : [...new Set((report?.rows || []).flatMap((r) => Object.keys(r)))].map((key) => ({
        key,
        label: labelize(key),
      }));

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Financial Reports"
        title="Financial Reports"
        subtitle="Download reports for every Fees & Finance module — preview, Excel, CSV, or download all at once"
        actions={
          <>
            <button
              type="button"
              disabled={reportLoading}
              onClick={() => void loadReport(activeType, academicYear, financialYear, payPeriod)}
              className={am.btnSecondary}
            >
              {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Refresh
            </button>
            <button
              type="button"
              disabled={downloadingAll}
              onClick={() => void handleDownloadAll()}
              className={am.btnPrimary}
            >
              {downloadingAll ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Download All Reports
            </button>
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className={`${am.card} ${am.cardPad} flex flex-wrap items-end gap-3`}>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setFinancialYear(e.target.value);
              }}
              className={`${am.select} mt-1 block`}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Financial Year</label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className={`${am.select} mt-1 block`}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Pay Period (Payroll)</label>
            <input
              type="month"
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
              className={`${am.input} mt-1 block`}
            />
          </div>
        </div>

        <div className={`${am.card} ${am.cardPad}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-3">
            Reports by Module ({catalog.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {catalog.map((item) => {
              const active = item.id === activeType;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveType(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-amber-400 border-amber-500 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.tab}
                </button>
              );
            })}
          </div>
        </div>

        {activeMeta && (
          <div className={`${am.card} ${am.cardPad} flex flex-col md:flex-row md:items-start justify-between gap-4`}>
            <div>
              <h2 className="text-base font-bold text-slate-900">{activeMeta.title}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">{activeMeta.description}</p>
              {needsPayPeriod && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Uses pay period <strong>{payPeriod}</strong> for payroll / EPF-ESIC data
                </p>
              )}
              {report && (
                <p className="text-[11px] text-slate-400 mt-2">
                  {report.rows.length} row{report.rows.length === 1 ? '' : 's'} · Generated{' '}
                  {new Date(report.generatedAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={downloading || reportLoading}
                onClick={() => void handleDownloadCurrent()}
                className={am.btnPrimary}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download Excel
              </button>
              <button
                type="button"
                disabled={downloading || reportLoading}
                onClick={() => void handleDownloadCsv()}
                className={am.btnSecondary}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
            </div>
          </div>
        )}

        {reportLoading && !report ? (
          <AcademicLoading label="Generating report preview…" />
        ) : (
          <>
            {(summaryEntries.length > 0 || nestedSummary.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summaryEntries.map(([key, value]) => (
                  <div key={key} className={`${am.card} p-4`}>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">
                      {labelize(key)}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCell(value)}</p>
                  </div>
                ))}
                {nestedSummary.map(([key, value]) => {
                  const obj = value as Record<string, unknown>;
                  return Object.entries(obj).slice(0, 4).map(([subKey, subValue]) => (
                    <div key={`${key}-${subKey}`} className={`${am.card} p-4`}>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">
                        {labelize(subKey)}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCell(subValue)}</p>
                    </div>
                  ));
                })}
              </div>
            )}

            <div className={am.tableWrap}>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full min-w-[640px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className={`${am.th} text-left whitespace-nowrap`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.rows || []).length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(columns.length, 1)} className={`${am.td} text-slate-400 italic`}>
                          No rows for this report in the selected period.
                        </td>
                      </tr>
                    ) : (
                      (report?.rows || []).slice(0, 200).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {columns.map((col) => (
                            <td key={col.key} className={`${am.td} whitespace-nowrap`}>
                              {formatCell(row[col.key])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {(report?.rows.length || 0) > 200 && (
                <p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">
                  Showing first 200 of {report?.rows.length} rows. Download Excel for the full report.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AcademicPageShell>
  );
}
