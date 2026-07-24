import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronDown,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  User,
  Users,
  FileText,
  IndianRupee,
  Award,
} from 'lucide-react';
import {
  createEmployeeDirectory,
  fetchEmployeeDirectoryDetail,
  formatInr,
  listEmployeeDirectory,
  type EmployeeDirectoryDetail,
  type EmployeeDirectoryRow,
} from '../../../lib/hrServices';
import { toViewKey } from '../../../lib/navigation';
import {
  am,
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
} from '../FeeFinanceManagement/FeeFinanceUi';

const PROFILE_TABS = [
  'Personal Information',
  'Job Information',
  'Education',
  'Experience',
  'Documents',
  'Salary Details',
  'Attendance',
  'Leave',
  'Performance',
  'Assets',
  'Training',
  'Family Details',
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

function InfoRow({ icon: Icon, label, value }: { icon?: typeof User; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      {Icon && <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 font-medium">{label}</p>
        <p className="text-xs text-slate-800 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-full flex flex-col">
      <h4 className="text-xs font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">{title}</h4>
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-3 pt-2 border-t border-slate-100">{footer}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
        active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Active' : status.replace(/_/g, ' ')}
    </span>
  );
}

type Props = {
  onNavigate?: (view: string) => void;
};

export function EmployeesDirectoryView({ onNavigate }: Props) {
  const [rows, setRows] = useState<EmployeeDirectoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployeeDirectoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('Personal Information');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    designation: '',
    department: '',
    classGroup: '',
    mobile: '',
    email: '',
  });

  const go = useCallback(
    (page: string) => {
      if (onNavigate) onNavigate(toViewKey('HR & Payroll Management', page));
    },
    [onNavigate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listEmployeeDirectory({
        q: search.trim() || undefined,
        status: statusFilter || undefined,
        seed: true,
      });
      setRows(data.records);
      if (data.records.length) {
        setSelectedId((prev) => prev || data.records[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchEmployeeDirectoryDetail(id);
      setDetail(data.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee profile');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const profile = useMemo(() => (detail?.profile || {}) as Record<string, string | string[] | unknown[]>, [detail]);

  const handleAdd = async () => {
    setError('');
    try {
      const { record } = await createEmployeeDirectory(addForm);
      setMessage(`Employee ${record.recordId} created`);
      setShowAddModal(false);
      setAddForm({ fullName: '', designation: '', department: '', classGroup: '', mobile: '', email: '' });
      setSelectedId(record.id);
      void loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const showPersonal =
    activeTab === 'Personal Information' || activeTab === 'Family Details';
  const showJob = activeTab === 'Personal Information' || activeTab === 'Job Information';
  const showSalary = activeTab === 'Personal Information' || activeTab === 'Salary Details';
  const showEducation = activeTab === 'Personal Information' || activeTab === 'Education';
  const showExperience = activeTab === 'Personal Information' || activeTab === 'Experience';
  const showDocuments = activeTab === 'Personal Information' || activeTab === 'Documents';
  const showFamily = activeTab === 'Personal Information' || activeTab === 'Family Details';
  const showSkills = activeTab === 'Personal Information' || activeTab === 'Training';
  const showDates = activeTab === 'Personal Information' || activeTab === 'Job Information';

  const renderPlaceholder = (title: string, target: string) => (
    <SectionCard title={title}>
      <p className="text-xs text-slate-500 mb-3">View detailed {title.toLowerCase()} in the dedicated module.</p>
      <button
        type="button"
        onClick={() => go(target)}
        className="text-xs font-semibold text-blue-600 hover:underline"
      >
        Open {target} →
      </button>
    </SectionCard>
  );

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Employees Directory"
        title="Employees Directory"
        subtitle="Search, view and manage complete employee profiles"
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={am.btnPrimary}
          >
            <Plus size={14} /> Add New Employee
          </button>
        }
      />

      <div className={am.content}>
        {message && (
          <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${am.input} pl-9`}
              placeholder="Search employees directory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className={am.btnSecondary}>
            <Filter size={14} /> Filters
          </button>
          <button type="button" onClick={() => void loadList()} className={am.btnSecondary}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {showFilters && (
            <select className={am.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          )}
        </div>

        {loading ? (
          <AcademicLoading label="Loading employees…" />
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Record ID</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Class / Group</th>
                  <th className={am.th}>Details</th>
                  <th className={am.th}>Updated</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 ${selectedId === row.id ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className={`${am.td} font-mono text-xs`}>{row.recordId}</td>
                    <td className={`${am.td} font-medium`}>{row.name}</td>
                    <td className={am.td}>{row.classGroup}</td>
                    <td className={`${am.td} text-xs text-slate-600`}>{row.details}</td>
                    <td className={`${am.td} text-xs`}>{row.updated}</td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="text-xs font-semibold text-amber-700 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedId && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={14} /> Back to Directory
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={`${am.btnSecondary} bg-blue-50 text-blue-700 border-blue-200`}>
                  Edit Employee
                </button>
                <button type="button" onClick={() => setShowAddModal(true)} className={`${am.btnPrimary} bg-green-500 hover:bg-green-600 border-green-500`}>
                  <Plus size={14} /> Add New Employee
                </button>
                <button type="button" className={am.btnSecondary}>
                  More <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {detailLoading || !detail ? (
              <AcademicLoading label="Loading employee profile…" />
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
                      <User size={40} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-slate-900">{detail.fullName}</h3>
                        <StatusBadge status={detail.status} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                        <InfoRow label="Employee ID" value={detail.employeeCode} />
                        <InfoRow label="Designation" value={detail.designation} />
                        <InfoRow label="Department" value={detail.department} />
                        <InfoRow label="School" value={String(profile.school || '')} />
                        <InfoRow icon={Mail} label="Email" value={detail.email} />
                        <InfoRow icon={Phone} label="Mobile" value={detail.mobile} />
                        <InfoRow icon={Calendar} label="Date of Joining" value={detail.joinDateDisplay} />
                        <InfoRow label="Employee Type" value={detail.employmentTypeLabel} />
                        <InfoRow label="Reporting To" value={String(profile.reportingTo || '')} />
                        <InfoRow icon={MapPin} label="Work Location" value={String(profile.workLocation || '')} />
                        <InfoRow label="Probation Ends" value={String(profile.probationEnds || '')} />
                        <InfoRow label="Confirmation Date" value={String(profile.confirmationDate || '')} />
                        <InfoRow label="Date of Birth" value={String(profile.dateOfBirth || '')} />
                        <InfoRow label="Gender" value={String(profile.gender || '')} />
                        <InfoRow label="Marital Status" value={String(profile.maritalStatus || '')} />
                        <InfoRow label="Blood Group" value={String(profile.bloodGroup || '')} />
                        <InfoRow label="Nationality" value={String(profile.nationality || '')} />
                        <InfoRow label="PAN Number" value={detail.panNumber} />
                        <InfoRow label="Aadhaar Number" value={String(profile.aadhaarNumber || '')} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border-b border-slate-200">
                  <div className="flex gap-1 min-w-max">
                    {PROFILE_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'Attendance' && renderPlaceholder('Attendance', 'Attendance & Leave')}
                {activeTab === 'Leave' && renderPlaceholder('Leave Records', 'Leave Management')}
                {activeTab === 'Performance' && renderPlaceholder('Performance', 'Performance Appraisal')}
                {activeTab === 'Assets' && renderPlaceholder('Assets', 'Documents')}

                {(activeTab === 'Personal Information' ||
                  activeTab === 'Job Information' ||
                  activeTab === 'Education' ||
                  activeTab === 'Experience' ||
                  activeTab === 'Documents' ||
                  activeTab === 'Salary Details' ||
                  activeTab === 'Family Details' ||
                  activeTab === 'Training') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {showPersonal && (
                      <SectionCard title="Personal Information">
                        <InfoRow icon={Users} label="Father's Name" value={String(profile.fatherName || '')} />
                        <InfoRow icon={Users} label="Mother's Name" value={String(profile.motherName || '')} />
                        <InfoRow icon={Users} label="Spouse Name" value={String(profile.spouseName || '')} />
                        <InfoRow icon={Mail} label="Personal Email" value={String(profile.personalEmail || '')} />
                        <InfoRow icon={Phone} label="Mobile Number" value={detail.mobile} />
                        <InfoRow label="Emergency Contact" value={String(profile.emergencyContact || '')} />
                        <InfoRow icon={Phone} label="Emergency Mobile" value={String(profile.emergencyMobile || '')} />
                        <InfoRow icon={MapPin} label="Present Address" value={String(profile.presentAddress || '')} />
                        <InfoRow icon={MapPin} label="Permanent Address" value={String(profile.permanentAddress || '')} />
                        <InfoRow label="Languages Known" value={String(profile.languagesKnown || '')} />
                        <InfoRow label="Hobbies" value={String(profile.hobbies || '')} />
                        <InfoRow label="LinkedIn Profile" value={String(profile.linkedIn || '')} />
                        <InfoRow label="ID Card Number" value={String(profile.idCardNumber || '')} />
                      </SectionCard>
                    )}

                    {showJob && (
                      <SectionCard title="Job Information">
                        <InfoRow icon={Calendar} label="Joining Date" value={detail.joinDateDisplay} />
                        <InfoRow label="Employee Type" value={detail.employmentTypeLabel} />
                        <InfoRow icon={Briefcase} label="Designation" value={detail.designation} />
                        <InfoRow label="Department" value={detail.department} />
                        <InfoRow label="Subject" value={String(profile.subject || '')} />
                        <InfoRow label="Class Teacher" value={String(profile.classTeacher || detail.classGroup)} />
                        <InfoRow label="Reporting To" value={String(profile.reportingTo || '')} />
                        <InfoRow icon={MapPin} label="Work Location" value={String(profile.workLocation || '')} />
                        <InfoRow label="Employment Status" value={String(profile.employmentStatus || 'Active')} />
                        <InfoRow label="Probation Ends" value={String(profile.probationEnds || '')} />
                        <InfoRow label="Confirmation Date" value={String(profile.confirmationDate || '')} />
                        <InfoRow label="Notice Period" value={String(profile.noticePeriod || '')} />
                      </SectionCard>
                    )}

                    {showSalary && (
                      <SectionCard title="Salary & Payment Information">
                        <InfoRow label="Pay Scale" value={String(profile.payScale || '')} />
                        <InfoRow
                          icon={IndianRupee}
                          label="Basic Salary"
                          value={detail.salary ? formatInr(detail.salary.basicSalary) : '—'}
                        />
                        <InfoRow
                          icon={IndianRupee}
                          label="Gross Salary"
                          value={detail.salary ? formatInr(detail.salary.grossSalary) : '—'}
                        />
                        <InfoRow label="Bank Name" value={String(profile.bankName || '')} />
                        <InfoRow label="Account Number" value={detail.bankAccount} />
                        <InfoRow label="IFSC Code" value={detail.bankIfsc} />
                        <InfoRow label="Payment Mode" value={String(profile.paymentMode || 'Bank Transfer')} />
                        <InfoRow label="PF Number" value={detail.pfNumber} />
                        <InfoRow label="ESI Number" value={detail.esicNumber} />
                        <InfoRow label="Professional Tax No." value={String(profile.professionalTaxNo || '')} />
                      </SectionCard>
                    )}

                    {showDates && (
                      <SectionCard title="Important Dates">
                        <InfoRow icon={Calendar} label="Date of Joining" value={detail.joinDateDisplay} />
                        <InfoRow icon={Calendar} label="Probation Ends" value={String(profile.probationEnds || '')} />
                        <InfoRow icon={Calendar} label="Confirmation Date" value={String(profile.confirmationDate || '')} />
                        <InfoRow icon={Calendar} label="Date of Birth" value={String(profile.dateOfBirth || '')} />
                        <InfoRow icon={Calendar} label="Marriage Anniversary" value={String(profile.marriageAnniversary || '')} />
                        <InfoRow icon={Calendar} label="Contract End Date" value={String(profile.contractEndDate || '')} />
                      </SectionCard>
                    )}

                    {showDocuments && (
                      <SectionCard
                        title="Documents"
                        footer={
                          <button type="button" onClick={() => go('Documents')} className="text-xs font-semibold text-blue-600 hover:underline">
                            View All Documents
                          </button>
                        }
                      >
                        {((profile.documents as Array<{ name: string; fileName: string }>) || []).map((doc, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={12} className="text-blue-500 shrink-0" />
                              <span className="text-xs text-slate-700 truncate">{doc.name}</span>
                            </div>
                            <button type="button" className="text-[10px] font-semibold text-blue-600 hover:underline shrink-0">
                              View
                            </button>
                          </div>
                        ))}
                        {!((profile.documents as unknown[]) || []).length && (
                          <p className="text-xs text-slate-500">No documents uploaded yet.</p>
                        )}
                      </SectionCard>
                    )}

                    {showEducation && (
                      <SectionCard
                        title="Education Details"
                        footer={
                          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                            View All Education
                          </button>
                        }
                      >
                        <ul className="space-y-2">
                          {((profile.education as Array<{ degree: string; year: string; institution: string }>) || []).map(
                            (edu, i) => (
                              <li key={i} className="text-xs text-slate-700 flex gap-2">
                                <GraduationCap size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                <span>
                                  <strong>{edu.degree}</strong> ({edu.year}) — {edu.institution}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </SectionCard>
                    )}

                    {showExperience && (
                      <SectionCard
                        title="Experience Details"
                        footer={
                          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                            View All Experience
                          </button>
                        }
                      >
                        <ul className="space-y-3">
                          {((profile.experience as Array<{ company: string; role: string; from: string; to: string }>) || []).map(
                            (exp, i) => (
                              <li key={i} className="text-xs border-l-2 border-blue-200 pl-3">
                                <p className="font-bold text-slate-800">{exp.company}</p>
                                <p className="text-slate-600">{exp.role}</p>
                                <p className="text-slate-400 text-[10px]">
                                  {exp.from} — {exp.to}
                                </p>
                              </li>
                            ),
                          )}
                        </ul>
                      </SectionCard>
                    )}

                    {showFamily && (
                      <SectionCard
                        title="Family Details"
                        footer={
                          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                            View Full Family Details
                          </button>
                        }
                      >
                        {((profile.family as Array<{ relation: string; name: string; dob?: string }>) || []).map(
                          (member, i) => (
                            <InfoRow
                              key={i}
                              icon={Users}
                              label={member.relation}
                              value={member.dob ? `${member.name} (${member.dob})` : member.name}
                            />
                          ),
                        )}
                      </SectionCard>
                    )}

                    {showSkills && (
                      <SectionCard
                        title="Skills & Certifications"
                        footer={
                          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                            View All Skills
                          </button>
                        }
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {((profile.skills as string[]) || []).map((skill, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold border border-blue-100"
                            >
                              <Award size={10} />
                              {skill}
                            </span>
                          ))}
                        </div>
                      </SectionCard>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AcademicModal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Employee">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Full Name *</label>
            <input className={am.input} value={addForm.fullName} onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Designation</label>
              <input className={am.input} value={addForm.designation} onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Department</label>
              <input className={am.input} value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Class / Group</label>
            <input className={am.input} value={addForm.classGroup} onChange={(e) => setAddForm((f) => ({ ...f, classGroup: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Mobile</label>
              <input className={am.input} value={addForm.mobile} onChange={(e) => setAddForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Email</label>
              <input className={am.input} value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={() => void handleAdd()} className={am.btnPrimary} disabled={!addForm.fullName.trim()}>
              Save Employee
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
