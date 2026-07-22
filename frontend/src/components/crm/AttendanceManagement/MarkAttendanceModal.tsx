import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, X, XCircle, Clock, CalendarX } from 'lucide-react';
import {
  fetchAttendanceRoster,
  markAttendance,
  type AttendanceRosterStudent,
} from '../../../lib/attendanceServices';

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  academicYear: string;
  className: string;
  sectionName: string;
  sessionDate: string;
  mode?: 'CLASS' | 'SUBJECT' | 'ACTIVITY';
  subjectName?: string;
  activityName?: string;
};

const STATUS_OPTIONS: { value: Status; label: string; icon: ReactNode; color: string }[] = [
  { value: 'PRESENT', label: 'P', icon: <CheckCircle2 size={12} />, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'ABSENT', label: 'A', icon: <XCircle size={12} />, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'LATE', label: 'L', icon: <Clock size={12} />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'ON_LEAVE', label: 'LV', icon: <CalendarX size={12} />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export function MarkAttendanceModal({
  open, onClose, onSaved, academicYear, className, sectionName, sessionDate,
  mode = 'CLASS', subjectName = '', activityName = '',
}: Props) {
  const [students, setStudents] = useState<AttendanceRosterStudent[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open || !className) return;
    setLoading(true);
    setError(null);
    try {
      const roster = await fetchAttendanceRoster({
        academicYear,
        className,
        sectionName,
        date: sessionDate,
        mode,
        subjectName,
        activityName,
      });
      setStudents(roster.students);
      const sm: Record<string, Status> = {};
      const rm: Record<string, string> = {};
      for (const s of roster.students) {
        sm[s.studentId] = (s.status as Status) || 'PRESENT';
        rm[s.studentId] = s.absentReason || '';
      }
      setStatusMap(sm);
      setReasonMap(rm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [open, academicYear, className, sectionName, sessionDate, mode, subjectName, activityName]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await markAttendance({
        academicYear,
        sessionDate,
        className,
        sectionName,
        mode,
        subjectName,
        activityName,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: statusMap[s.studentId] || 'PRESENT',
          checkInTime: statusMap[s.studentId] === 'PRESENT' || statusMap[s.studentId] === 'LATE' ? checkInTime : '',
          absentReason: reasonMap[s.studentId] || '',
          lateMinutes: statusMap[s.studentId] === 'LATE' ? 15 : 0,
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Mark Attendance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {className}{sectionName ? ` - ${sectionName}` : ''} · {sessionDate} · {mode}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.studentId} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.rollNumber || s.admissionNumber}</p>
                  </div>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.value}
                        onClick={() => setStatusMap((m) => ({ ...m, [s.studentId]: opt.value }))}
                        className={`w-8 h-8 rounded border text-xs font-bold flex items-center justify-center transition-colors ${
                          statusMap[s.studentId] === opt.value ? opt.color : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(statusMap[s.studentId] === 'ABSENT' || statusMap[s.studentId] === 'ON_LEAVE') && (
                    <input
                      type="text"
                      placeholder="Reason for absence"
                      value={reasonMap[s.studentId] || ''}
                      onChange={(e) => setReasonMap((m) => ({ ...m, [s.studentId]: e.target.value }))}
                      className="flex-1 min-w-[160px] text-xs border border-slate-200 rounded px-2 py-1.5"
                    />
                  )}
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-center text-slate-400 py-8 italic">No students found for this class</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || loading || students.length === 0}
            onClick={() => void handleSave()}
            className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
}
