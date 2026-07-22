import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import {
  fetchAttendanceDrilldown,
  type AttendanceDrilldown,
  type AttendanceDrilldownType,
} from '../../../lib/attendanceServices';
import { downloadAttendanceDrilldownExcel } from '../../../lib/attendanceReportExcel';

type Props = {
  open: boolean;
  onClose: () => void;
  type: AttendanceDrilldownType;
  title?: string;
  academicYear: string;
  sectionName?: string;
  date?: string;
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

export function AttendanceDrilldownModal({
  open, onClose, type, title, academicYear, sectionName, date,
}: Props) {
  const [data, setData] = useState<AttendanceDrilldown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAttendanceDrilldown(type, {
        academicYear,
        sectionName: sectionName && sectionName !== 'All Sections' ? sectionName : undefined,
        date,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open, type, academicYear, sectionName, date]);

  useEffect(() => { void load(); }, [load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title || data?.title || 'Attendance Details'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{data?.rows.length ?? 0} records · {academicYear}</p>
          </div>
          <div className="flex items-center gap-2">
            {data && data.rows.length > 0 && (
              <button
                type="button"
                onClick={() => downloadAttendanceDrilldownExcel(data, academicYear)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download size={14} />
                Download Excel
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
                  {data?.columns.map((c) => (
                    <th key={c.key} className="pb-2 pr-3 font-semibold whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).length === 0 ? (
                  <tr><td colSpan={data?.columns.length || 1} className="py-8 text-center text-slate-400 italic">No records found</td></tr>
                ) : (
                  data?.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/80">
                      {data.columns.map((c) => (
                        <td key={c.key} className="py-2 pr-3 text-slate-700 whitespace-nowrap">{formatCell(row[c.key])}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
