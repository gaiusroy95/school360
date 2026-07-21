import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Loader2,
  FileSpreadsheet,
  IndianRupee,
  Users,
  GraduationCap,
  Receipt,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  fetchAdmissionReports,
  fetchAdmissionReportsMeta,
  type AdmissionReportData,
  type AdmissionReportSummary,
} from '../../../lib/admissionReportsServices';
import { downloadAdmissionReportsExcel } from '../../../lib/admissionReportsExcel';

function formatCurrency(amount: number, currency = 'INR') {
  if (currency === 'INR') {
    return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdmissionReportsView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchAdmissionReportsMeta>> | null>(
    null,
  );
  const [report, setReport] = useState<AdmissionReportData | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const m = await fetchAdmissionReportsMeta();
    setMeta(m);
    setAcademicYear(m.defaultAcademicYear);
    return m;
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAdmissionReports({
        academicYear,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setReport(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [academicYear, dateFrom, dateTo]);

  useEffect(() => {
    void loadMeta().then(() => loadReport());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const data =
        report ||
        (await fetchAdmissionReports({
          academicYear,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }));
      downloadAdmissionReportsExcel(data, academicYear);
      if (!report) setReport(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  const summary: AdmissionReportSummary | null = report?.summary || null;
  const consolidated = report?.sheets.consolidatedNewAdmissions || [];

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={28} />
            Admission CRM Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated reports across enquiries, applications, merit, seats, admissions, and fee
            collection — export as Excel workbook.
          </p>
        </div>
        <button
          type="button"
          disabled={exporting || loading}
          onClick={() => void handleExport()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm"
        >
          {exporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          Download Excel Report
        </button>
      </div>

      {errorMsg && (
        <div className="mb-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-100 shrink-0">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-3">
          <Filter size={14} className="text-indigo-600" />
          Report Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {(meta?.academicYears || [academicYear]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Date From (optional)
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Date To (optional)
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-end gap-2">
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh Preview
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Academic year filters admissions, seat allocation, and fee collection. Date range filters
          enquiries, applications, follow-ups, counselling, and fee receipts.
        </p>
      </div>

      {loading && !report ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading report data…
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 shrink-0">
              {[
                { label: 'Enquiries', value: summary.enquiries, icon: Users },
                { label: 'Applications', value: summary.applications, icon: FileSpreadsheet },
                {
                  label: 'Admissions',
                  value: `${summary.admissionsConfirmed}/${summary.admissionsTotal}`,
                  icon: GraduationCap,
                },
                { label: 'Seat Allocations', value: summary.seatAllocations, icon: Users },
                { label: 'Fee Receipts', value: summary.feeReceipts, icon: Receipt },
                {
                  label: 'Fee Collected',
                  value: formatCurrency(summary.totalFeeCollected, summary.currency),
                  icon: IndianRupee,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <card.icon size={14} className="text-indigo-600" />
                    {card.label}
                  </div>
                  <p className="text-lg font-bold text-slate-800">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Consolidated New Admissions (with Fee Collected)
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {summary
                    ? `${summary.institutionName} · AY ${summary.academicYear} · Generated ${formatDateTime(summary.generatedAt)}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(meta?.reportSheets || []).slice(0, 5).map((s) => (
                  <span
                    key={s.key}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold"
                  >
                    {s.label}
                  </span>
                ))}
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                  +{(meta?.reportSheets.length || 0) - 5} more in Excel
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">Admission No.</th>
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-left p-3 font-semibold">Class</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Merit</th>
                    <th className="text-left p-3 font-semibold">Fee Collected</th>
                    <th className="text-left p-3 font-semibold">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consolidated.map((row, i) => (
                    <tr key={`${row.applicationId}-${i}`} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs font-semibold text-indigo-700">
                        {String(row.admissionNumber || '—')}
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{String(row.studentName)}</p>
                        <p className="text-[10px] text-slate-400">{String(row.applicationId)}</p>
                      </td>
                      <td className="p-3 text-slate-600">
                        {String(row.className)}
                        {row.sectionName ? `-${String(row.sectionName)}` : ''}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            row.admissionStatus === 'Confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {String(row.admissionStatus)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {row.meritRank ? `#${String(row.meritRank)}` : '—'}
                        {row.entranceScorePercent != null && row.entranceScorePercent !== ''
                          ? ` · ${String(row.entranceScorePercent)}%`
                          : ''}
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {formatCurrency(Number(row.totalFeeCollected || 0), summary?.currency)}
                      </td>
                      <td className="p-3 text-xs text-slate-500">{String(row.feeReceiptCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {consolidated.length === 0 && (
                <p className="text-center text-slate-500 py-12 text-sm">
                  No admission records for this academic year yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
