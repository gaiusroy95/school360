import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User, BookOpen, Calendar, IndianRupee, FileText, Bus, Home, HeartPulse,
  MessageSquare, Award, Loader2, Pencil, Download, Search, Users,
} from 'lucide-react';
import {
  fetchStudent,
  fetchStudents,
  fetchStudentsMeta,
  getProfileStudentId,
  setProfileStudentId,
  type Student,
  type StudentProfileMeta,
} from '../../../lib/studentServices';
import { fetchInstitutionSetup } from '../../../lib/institutionApi';
import {
  defaultStudentTemplateFromSetup,
  resolveStudentIdCardTemplate,
  schoolFromInstitutionSetup,
  studentToIdCardStudent,
} from '../../../lib/idCardUtils';
import { downloadStudentIdCardPdf } from '../../../lib/studentIdCardPdf';
import { StudentProfileTabContent } from './StudentProfileTabContent';
import { StudentProfileEditModal } from './StudentProfileEditModal';

const DEFAULT_PROFILE: StudentProfileMeta = {
  feeDueAmount: 0,
  feePaidTotal: 0,
  attendanceToday: 'Present',
  idCardTemplate: '',
  admissionForm: {},
};

const TABS = [
  { name: 'Overview', icon: <User size={14} /> },
  { name: 'Academics', icon: <BookOpen size={14} /> },
  { name: 'Attendance', icon: <Calendar size={14} /> },
  { name: 'Fees', icon: <IndianRupee size={14} /> },
  { name: 'Examination', icon: <FileText size={14} /> },
  { name: 'Library', icon: <BookOpen size={14} /> },
  { name: 'Transport', icon: <Bus size={14} /> },
  { name: 'Hostel', icon: <Home size={14} /> },
  { name: 'Medical', icon: <HeartPulse size={14} /> },
  { name: 'Comms', icon: <MessageSquare size={14} /> },
  { name: 'Documents', icon: <FileText size={14} /> },
  { name: 'Behavior', icon: <Award size={14} /> },
];

type FilterState = {
  name: string;
  fatherName: string;
  className: string;
  rollNumber: string;
  sectionName: string;
};

const emptyFilters = (): FilterState => ({
  name: '',
  fatherName: '',
  className: '',
  rollNumber: '',
  sectionName: '',
});

export function StudentProfilesView() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [student, setStudent] = useState<Student | null>(null);
  const [profile, setProfile] = useState<StudentProfileMeta>(DEFAULT_PROFILE);
  const [activities, setActivities] = useState<{ title: string; time: string; type: string }[]>([]);
  const [alerts, setAlerts] = useState<{ icon: string; title: string; desc: string; color: string }[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [tableSearch, setTableSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [institutionSetup, setInstitutionSetup] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');

  const loadStudent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchStudent(id);
      setStudent(res.student);
      setProfile(res.profile || DEFAULT_PROFILE);
      setActivities(res.activities);
      setAlerts(res.alerts);
      setProfileStudentId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoster = useCallback(async () => {
    const [list, meta] = await Promise.all([
      fetchStudents({ pageSize: 500, viewAll: true }),
      fetchStudentsMeta(),
    ]);
    setAllStudents(list.students);
    setClassOptions(meta.filters.classes);
    return list.students;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [{ setup }, students] = await Promise.all([
          fetchInstitutionSetup(),
          loadRoster(),
        ]);
        setInstitutionSetup(setup as Record<string, unknown>);
        const id = getProfileStudentId() || students[0]?.id;
        if (id) await loadStudent(id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, [loadStudent, loadRoster]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSectionOptions(filters.className ? m.filters.sectionsByClass[filters.className] || [] : []);
    });
  }, [filters.className]);

  const filteredStudents = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (filters.name && !s.fullName.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.fatherName && !s.fatherName.toLowerCase().includes(filters.fatherName.toLowerCase())) return false;
      if (filters.className && s.className !== filters.className) return false;
      if (filters.sectionName && s.sectionName !== filters.sectionName) return false;
      if (filters.rollNumber && !s.rollNumber.toLowerCase().includes(filters.rollNumber.toLowerCase())) return false;
      if (q) {
        const hay = `${s.fullName} ${s.admissionNumber} ${s.rollNumber} ${s.fatherName} ${s.classSection}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allStudents, filters, tableSearch]);

  const applyFilterFind = () => {
    const match = filteredStudents[0];
    if (match) void loadStudent(match.id);
    else setMessage('No student matches the filter criteria.');
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
    setTableSearch('');
    setMessage('');
  };

  const handleDownloadIdCard = async () => {
    if (!student) return;
    setDownloadingId(true);
    setMessage('');
    try {
      const school = schoolFromInstitutionSetup(institutionSetup);
      const defaultTpl = defaultStudentTemplateFromSetup(institutionSetup);
      const templateId = resolveStudentIdCardTemplate(student, profile.idCardTemplate, defaultTpl);
      const cardStudent = studentToIdCardStudent(student);
      const safeName = student.fullName.replace(/[^a-zA-Z0-9]+/g, '_');
      await downloadStudentIdCardPdf(templateId, cardStudent, school, `ID_Card_${safeName}.pdf`);
      setMessage('ID card downloaded successfully.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to download ID card');
    } finally {
      setDownloadingId(false);
    }
  };

  const editTabForModal = ['Comms', 'Behavior', 'Examination', 'Library'].includes(activeTab)
    ? activeTab === 'Examination' ? 'Academics' : activeTab === 'Library' ? 'Documents' : 'Overview'
    : activeTab;

  if (loading && !student) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (!student) {
    return (
      <div className="text-center p-12 text-slate-500">
        <Users className="mx-auto mb-3 text-slate-300" size={40} />
        <p>No students in roster yet. Add students or confirm admissions first.</p>
      </div>
    );
  }

  const avatar = student.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.fullName)}`;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="p-4 md:p-6 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-200 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                <img src={avatar} alt={student.fullName} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800">{student.fullName}</h1>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">{student.status}</span>
                  {profile.feeDueAmount > 0 && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                      Fee Due: ₹{profile.feeDueAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                  {profile.attendanceToday === 'Absent' && (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">Absent Today</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                  <span>Admission No: <strong>{student.admissionNumber}</strong></span>
                  <span>Roll No: <strong>{student.rollNumber || '—'}</strong></span>
                  {student.rfidTag && <span>RFID: <strong>{student.rfidTag}</strong></span>}
                  <span>Class: <strong>{student.classSection}</strong></span>
                </div>
                {alerts.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {alerts.map((a, i) => (
                      <div key={i} className={`text-[10px] font-medium px-2 py-1 rounded border ${a.color}`}>
                        {a.icon} {a.title}: {a.desc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
              >
                <Pencil size={14} /> Edit Profile
              </button>
              <button
                type="button"
                disabled={downloadingId}
                onClick={() => void handleDownloadIdCard()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloadingId ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download ID Card
              </button>
            </div>
          </div>
          {message && <p className="text-xs text-indigo-600 mt-2">{message}</p>}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 md:px-6 gap-1 border-t border-slate-100 pt-1 custom-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.name ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main + filter */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1600px] mx-auto">
          <div className="xl:col-span-8 space-y-4">
            <StudentProfileTabContent tab={activeTab} student={student} profile={profile} activities={activities} />

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users size={14} /> All Students — search &amp; open profile
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <span className="text-xs text-slate-500 self-center">{filteredStudents.length} student(s)</span>
              </div>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Name</th>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Father</th>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Class</th>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Section</th>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Roll</th>
                      <th className="p-2 text-left text-xs font-bold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => void loadStudent(s.id)}
                        className={`border-t cursor-pointer hover:bg-indigo-50 ${s.id === student.id ? 'bg-indigo-50/80' : ''}`}
                      >
                        <td className="p-2 font-medium text-slate-800">{s.fullName}</td>
                        <td className="p-2 text-slate-600">{s.fatherName || '—'}</td>
                        <td className="p-2 text-slate-600">{s.className}</td>
                        <td className="p-2 text-slate-600">{s.sectionName || '—'}</td>
                        <td className="p-2 text-slate-600">{s.rollNumber || '—'}</td>
                        <td className="p-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right filter panel */}
          <div className="xl:col-span-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Find Student Profile</h3>
              <p className="text-[10px] text-slate-500 mb-4">Filter by name, father&apos;s name, class, roll no, or section</p>
              <div className="space-y-3">
                <FilterField label="Name" value={filters.name} onChange={(v) => setFilters((f) => ({ ...f, name: v }))} />
                <FilterField label="Father's Name" value={filters.fatherName} onChange={(v) => setFilters((f) => ({ ...f, fatherName: v }))} />
                <FilterField label="Class" value={filters.className} onChange={(v) => setFilters((f) => ({ ...f, className: v, sectionName: '' }))} options={['', ...classOptions]} />
                <FilterField label="Roll No" value={filters.rollNumber} onChange={(v) => setFilters((f) => ({ ...f, rollNumber: v }))} />
                <FilterField label="Section" value={filters.sectionName} onChange={(v) => setFilters((f) => ({ ...f, sectionName: v }))} options={['', ...sectionOptions]} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={applyFilterFind} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  Find Student
                </button>
                <button type="button" onClick={clearFilters} className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                  Clear
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-3">Recent Activity</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500">No recent activity.</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {activities.slice(0, 5).map((a, i) => (
                      <div key={i}>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{a.type}</span>
                        <p className="text-xs font-medium text-slate-800">{a.title}</p>
                        <p className="text-[10px] text-slate-400">{new Date(a.time).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <StudentProfileEditModal
          student={student}
          activeTab={editTabForModal === 'Overview' ? 'Overview' : editTabForModal}
          profileMeta={{
            feeDueAmount: profile.feeDueAmount,
            attendanceToday: profile.attendanceToday,
            idCardTemplate: profile.idCardTemplate,
          }}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            void loadStudent(updated.id);
            void loadRoster();
            setMessage('Profile updated successfully.');
          }}
        />
      )}
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-600 mb-1">{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
          {options.map((o) => <option key={o || 'all'} value={o}>{o || 'All'}</option>)}
        </select>
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
      )}
    </div>
  );
}
