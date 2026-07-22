import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, X, Smartphone } from 'lucide-react';
import { fetchTeacherAttendanceDay, type TeacherDayDetail } from '../../../lib/attendanceServices';
import { downloadTeacherDayDetailExcel } from '../../../lib/teacherAttendanceExcel';

const SECTION_STYLES: Record<string, string> = {
  PRESENT: 'border-green-200 bg-green-50/50',
  PLANNED_LEAVE_ABSENT: 'border-blue-200 bg-blue-50/50',
  MEDICAL_LEAVE_ABSENT: 'border-purple-200 bg-purple-50/50',
  UNPLANNED_ABSENT: 'border-amber-200 bg-amber-50/50',
  UNPLANNED_NOT_INTIMATED: 'border-red-200 bg-red-50/50',
};

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  academicYear: string;
};

export function TeacherAttendanceDayModal({ open, onClose, date, academicYear }: Props) {
  const [detail, setDetail] = useState<TeacherDayDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open || !date) return;
    setLoading(true);
    try {
      setDetail(await fetchTeacherAttendanceDay({ date, academicYear }));
    } finally {
      setLoading(false);
    }
  }, [open, date, academicYear]);

  useEffect(() => { void load(); }, [load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Teacher Attendance — Day Detail</h3>
            <p className="text-sm text-slate-600 mt-0.5">{detail?.dateLabel || date}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Smartphone size={10} />
              Data captured from teacher mobile app
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detail && (
              <button
                type="button"
                onClick={() => downloadTeacherDayDetailExcel(detail)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                <Download size={14} />
                Export Day
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                {detail.sections.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-100 p-2">
                    <p className="text-[9px] text-slate-500 font-semibold uppercase leading-tight">{s.title}</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{s.count}</p>
                  </div>
                ))}
              </div>

              {detail.sections.map((section) => (
                <div
                  key={section.id}
                  className={`rounded-xl border p-4 ${SECTION_STYLES[section.id] || 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800">{section.title}</h4>
                    <span className="text-xs font-semibold text-slate-500">{section.count} teacher{section.count === 1 ? '' : 's'}</span>
                  </div>
                  {section.count === 0 ? (
                    <p className="text-xs text-slate-400 italic">No teachers in this category</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200/60">
                            <th className="text-left py-2 pr-3 font-semibold">Teacher</th>
                            <th className="text-left py-2 pr-3 font-semibold">Department</th>
                            <th className="text-left py-2 pr-3 font-semibold">Check-in</th>
                            <th className="text-left py-2 font-semibold">Remarks (from app)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(section.teachers || []).map((t) => (
                            <tr key={t.id} className="border-b border-slate-100/80">
                              <td className="py-2 pr-3">
                                <p className="font-semibold text-slate-800">{t.teacher.teacherName}</p>
                                <p className="text-[10px] text-slate-400">{t.teacher.employeeCode}</p>
                              </td>
                              <td className="py-2 pr-3 text-slate-600">{t.teacher.department}</td>
                              <td className="py-2 pr-3 text-slate-600">{t.checkInTime || '—'}</td>
                              <td className="py-2 text-slate-600">{t.teacherRemarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {detail.unmarkedCount > 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Not Marked ({detail.unmarkedCount})</h4>
                  <p className="text-xs text-slate-500">
                    {detail.unmarkedTeachers.map((t) => t.teacherName).join(', ')}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
