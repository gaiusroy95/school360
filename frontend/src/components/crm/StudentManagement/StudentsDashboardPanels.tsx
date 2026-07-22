import {
  BookOpen, Briefcase, Calendar as CalendarIcon, FileText, IndianRupee, MoreVertical,
  Users, Upload, PlusCircle, CheckCircle2, AlertCircle, TrendingUp,
} from 'lucide-react';
import type { Student, StudentAnalytics, StudentSummary } from '../../../lib/studentServices';

type Alert = { icon: string; title: string; desc: string; time: string; color: string };
type Activity = { title: string; time: string; type: string };

const DEFAULT_ALERTS: Alert[] = [
  { icon: '📋', title: 'Documents', desc: 'Upload pending documents in Student Profiles', time: 'Action needed', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: '💰', title: 'Fee Setup', desc: 'Configure fee structure in Fees & Finance', time: 'Optional', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { icon: '📅', title: 'Attendance', desc: 'Marks sync when Attendance module is active', time: 'Upcoming', color: 'bg-slate-50 text-slate-600 border-slate-200' },
];

export function StudentSidebarPanel({
  student,
  alerts,
  activities,
  onViewProfile,
}: {
  student: Student;
  alerts: Alert[];
  activities: Activity[];
  onViewProfile: () => void;
}) {
  const displayAlerts = alerts.length > 0 ? alerts : DEFAULT_ALERTS.slice(0, 2);

  const displayActivities =
    activities.length > 0
      ? activities
      : [
          {
            title: `Enrolled in ${student.academicYear} — ${student.classSection}`,
            time: student.enrolledAt,
            type: 'Enrollment',
          },
        ];

  const quickActions = [
    { label: 'Edit Profile', icon: <Briefcase size={12} />, onClick: onViewProfile },
    { label: 'Academic', icon: <BookOpen size={12} />, onClick: onViewProfile },
    { label: 'Attendance', icon: <CalendarIcon size={12} />, onClick: onViewProfile },
    { label: 'Fees', icon: <IndianRupee size={12} />, onClick: onViewProfile },
    { label: 'Documents', icon: <FileText size={12} />, onClick: onViewProfile },
    { label: 'More', icon: <MoreVertical size={12} />, onClick: onViewProfile },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-slate-800">Student Profile</h3>
          <button type="button" onClick={onViewProfile} className="text-[10px] text-blue-600 font-medium hover:underline">
            View Full Profile
          </button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden shrink-0 shadow-sm">
            <img
              src={student.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.fullName)}`}
              alt={student.fullName}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm">{student.fullName}</h4>
              <span
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${student.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}
              >
                {student.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Admission No.: <span className="font-medium text-slate-700">{student.admissionNumber}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              Roll No.: <span className="font-medium text-slate-700">{student.rollNumber || '—'}</span>
            </p>
          </div>
        </div>
        <div className="space-y-1.5 text-[10px] mb-4">
          <InfoRow label="Class - Section" value={student.classSection} />
          <InfoRow label="Date of Birth" value={`${student.dob || '—'}${student.age != null ? ` (${student.age} Yrs)` : ''}`} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Mobile" value={student.mobile || '—'} />
          <InfoRow label="Email" value={student.email || '—'} className="text-blue-600" />
          <InfoRow label="Address" value={student.address || '—'} />
          <InfoRow label="Blood Group" value={student.bloodGroup || '—'} className="text-red-600" />
          <InfoRow label="Father" value={student.father || '—'} />
          <InfoRow label="Mother" value={student.mother || '—'} />
        </div>
        <div className="grid grid-cols-6 gap-1 pt-3 border-t border-slate-100">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-1 group-hover:bg-blue-50 group-hover:text-blue-600 border border-slate-200">
                {action.icon}
              </div>
              <span className="text-[8px] text-slate-500 text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold text-slate-800">Student Alerts</h3>
          <span className="text-[9px] text-slate-400">{displayAlerts.length} active</span>
        </div>
        <div className="space-y-3">
          {displayAlerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${alert.color}`}>
                {alert.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-[10px] font-bold text-slate-800">{alert.title}</p>
                  <span className="text-[8px] text-slate-400 whitespace-nowrap">{alert.time}</span>
                </div>
                <p className="text-[9px] text-slate-500 leading-snug">{alert.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[160px]">
        <h3 className="text-[11px] font-bold text-slate-800 mb-3">Recent Activities</h3>
        <div className="relative pl-3 border-l border-slate-200 space-y-4 ml-1">
          {displayActivities.slice(0, 5).map((act, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[17px] top-0 w-3 h-3 rounded-full border-2 border-white bg-indigo-500" />
              <p className="text-[10px] font-medium text-slate-700 leading-tight">{act.title}</p>
              <p className="text-[8px] text-slate-400 mt-0.5">
                {act.time ? new Date(act.time).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RosterInsightsPanel({
  summary,
  analytics,
  students,
  onNavigate,
  onSync,
}: {
  summary: StudentSummary | null;
  analytics: StudentAnalytics | null;
  students: Student[];
  onNavigate: (page: string) => void;
  onSync: () => void;
}) {
  const total = summary?.total ?? 0;
  const classStats = analytics?.classStats ?? [];
  const documents = analytics?.documents ?? [];
  const docUploaded = documents.reduce((s, d) => s + d.uploaded, 0);
  const docTotal = documents.reduce((s, d) => s + d.total, 0);
  const docPct = docTotal > 0 ? Math.round((docUploaded / docTotal) * 100) : 0;
  const isSmallRoster = total > 0 && total <= 20;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-indigo-600" />
          <h3 className="text-[11px] font-bold text-slate-800">Class-wise Roster</h3>
        </div>
        {classStats.length === 0 ? (
          <p className="text-xs text-slate-500">No class data yet. Add students to see distribution.</p>
        ) : (
          <div className="space-y-2.5">
            {classStats.map((row) => {
              const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <div key={row.name}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-600 font-medium truncate pr-2">{row.name}</span>
                    <span className="text-slate-800 font-bold shrink-0">
                      {row.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-blue-600" />
          <h3 className="text-[11px] font-bold text-slate-800">Document Compliance</h3>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${docPct} ${100 - docPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-800">
              {docPct}%
            </span>
          </div>
          <div className="text-[10px] text-slate-600 space-y-1">
            <p>
              <span className="font-bold text-slate-800">{docUploaded}</span> of {docTotal} document slots filled
            </p>
            <p className="text-slate-400">Across {total} enrolled student{total === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {documents.slice(0, 4).map((doc) => (
            <div key={doc.name} className="bg-slate-50 rounded-lg px-2 py-1.5 text-[9px]">
              <span className="text-slate-600 block truncate">{doc.name}</span>
              <span className="font-bold text-slate-800">
                {doc.uploaded}/{doc.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-indigo-600" />
          <h3 className="text-[11px] font-bold text-slate-800">
            {isSmallRoster ? 'Grow Your Roster' : 'Roster Health'}
          </h3>
        </div>
        {isSmallRoster ? (
          <div className="space-y-2">
            {[
              { done: total > 0, text: 'First student enrolled', icon: <CheckCircle2 size={12} /> },
              { done: students.some((s) => s.rollNumber), text: 'Assign roll numbers', icon: <CheckCircle2 size={12} /> },
              { done: docPct > 0, text: 'Upload student documents', icon: <FileText size={12} /> },
              { done: false, text: 'Import bulk students via Excel', icon: <Upload size={12} /> },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-[10px] ${step.done ? 'text-emerald-700' : 'text-slate-600'}`}>
                <span className={step.done ? 'text-emerald-500' : 'text-slate-300'}>{step.icon}</span>
                {step.text}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('Add New Student')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700"
              >
                <PlusCircle size={12} /> Add Student
              </button>
              <button
                type="button"
                onClick={() => onNavigate('Bulk Import')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium hover:bg-slate-50"
              >
                <Upload size={12} /> Bulk Import
              </button>
              <button
                type="button"
                onClick={onSync}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium hover:bg-slate-50"
              >
                Sync Admissions
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Active rate</span>
              <span className="font-bold text-slate-800">
                {total > 0 ? ((summary!.active / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Avg attendance</span>
              <span className="font-bold text-slate-800">{summary?.averageAttendance ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">New this year</span>
              <span className="font-bold text-slate-800">{summary?.newAdmissions ?? 0}</span>
            </div>
            <p className="text-slate-400 pt-1 flex items-start gap-1">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              Roster is healthy. Use filters and reports for deeper analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-medium text-slate-800 ${className}`}>{value}</span>
    </div>
  );
}
