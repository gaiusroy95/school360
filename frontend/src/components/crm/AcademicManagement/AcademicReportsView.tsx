import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import {
  fetchAcademicMeta,
  fetchAcademicReport,
  fetchAcademicReportsMeta,
  fetchAllAcademicReports,
  type AcademicReportCatalogItem,
  type AcademicReportPayload,
  type AcademicReportType,
} from '../../../lib/academicServices';
import { downloadAcademicReportExcel, downloadAllAcademicReportsExcel } from '../../../lib/academicReportExcel';
import { API_URL, getToken } from '../../../lib/api';
import {
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  AcademicYearTermFilters,
  am,
} from './AcademicManagementUi';

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

export function AcademicReportsView() {
  const [catalog, setCatalog] = useState<AcademicReportCatalogItem[]>([]);
  const [activeType, setActiveType] = useState<AcademicReportType>('overview');
  const [report, setReport] = useState<AcademicReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [term, setTerm] = useState('Term 1');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [terms, setTerms] = useState<string[]>(['Term 1', 'Term 2']);

  const activeMeta = useMemo(
    () => catalog.find((c) => c.id === activeType) || catalog[0],
    [catalog, activeType],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [meta, reportsMeta] = await Promise.all([
        fetchAcademicMeta(),
        fetchAcademicReportsMeta(),
      ]);
      setYears(meta.academicYears?.length ? meta.academicYears : ['2025-26']);
      setTerms(meta.terms?.length ? meta.terms : ['Term 1', 'Term 2']);
      setAcademicYear(meta.defaultAcademicYear || meta.academicYears?.[0] || '2025-26');
      if (meta.terms?.[0]) setTerm(meta.terms[0]);
      setCatalog(reportsMeta.reports);
      if (reportsMeta.reports[0]) setActiveType(reportsMeta.reports[0].id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load report catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (type: AcademicReportType, year: string, termValue: string) => {
    setReportLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAcademicReport(type, { academicYear: year, term: termValue });
      setReport(data);
    } catch (err) {
      setReport(null);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (loading || !catalog.length) return;
    void loadReport(activeType, academicYear, term);
  }, [loading, catalog.length, activeType, academicYear, term, loadReport]);

  const handleDownloadCurrent = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      const data =
        report?.reportType === activeType
          ? report
          : await fetchAcademicReport(activeType, { academicYear, term });
      downloadAcademicReportExcel(data);
      setReport(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Excel download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setErrorMsg(null);
    try {
      const pack = await fetchAllAcademicReports({ academicYear, term });
      downloadAllAcademicReportsExcel(pack);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to download all reports');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      if (!API_URL) throw new Error('API URL is not configured');
      const params = new URLSearchParams({ academicYear, term, format: 'csv' });
      const headers = new Headers();
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(`${API_URL}/api/academic/reports/${activeType}?${params}`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'CSV download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Academic_${activeType.replace(/-/g, '_')}_${academicYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <AcademicLoading label="Loading academic reports…" />;

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
        breadcrumb="Academic Management › Academic Reports"
        title="Academic Reports"
        subtitle="Download performance reports for every Academic Management tab — preview, Excel, or CSV"
        actions={(
          <>
            <button
              type="button"
              disabled={reportLoading}
              onClick={() => void loadReport(activeType, academicYear, term)}
              className={am.btnSecondary}
            >
              {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
            <button
              type="button"
              disabled={downloadingAll}
              onClick={() => void handleDownloadAll()}
              className={am.btnDark}
            >
              {downloadingAll ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Download All Reports
            </button>
          </>
        )}
      />

      <div className={am.content}>
        {errorMsg && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <AcademicYearTermFilters
          academicYear={academicYear}
          term={term}
          years={years}
          terms={terms}
          onYear={setAcademicYear}
          onTerm={setTerm}
        />

        <div className={`${am.card} ${am.cardPad}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-3">
            Reports by Academic Tab ({catalog.length})
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
              <button type="button" disabled={downloading || reportLoading} onClick={() => void handleDownloadCsv()} className={am.btnSecondary}>
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
                          No rows for this report in the selected year / term.
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
