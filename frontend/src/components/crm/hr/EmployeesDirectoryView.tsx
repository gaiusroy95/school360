import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Upload,
  User,
  Users,
  FileText,
  IndianRupee,
  Award,
  X,
} from 'lucide-react';
import {
  bulkUploadEmployeeDirectory,
  createEmployeeDirectory,
  fetchDepartmentEmployeeOptions,
  fetchEmployeeDirectoryDetail,
  formatInr,
  listEmployeeDirectory,
  listHrDepartments,
  updateEmployeeDirectory,
  type EmployeeDirectoryDetail,
  type EmployeeDirectoryRow,
  type EmployeeOption,
  type HrDepartmentSummary,
} from '../../../lib/hrServices';
import { fetchAcademicMeta } from '../../../lib/academicServices';
import {
  downloadEmployeeDirectoryTemplate,
  parseEmployeeDirectoryUploadFile,
} from '../../../lib/employeeDirectoryExcel';
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

const EMPLOYMENT_TYPES = [
  { value: 'TEACHING', label: 'Teaching' },
  { value: 'NON_TEACHING', label: 'Non Teaching' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPPORT', label: 'Support' },
];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL = ['Single', 'Married', 'Widowed', 'Divorced'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function str(value: unknown) {
  return value == null ? '' : String(value);
}

function withCurrent(options: Array<{ value: string; label: string }>, current: string) {
  if (!current || options.some((o) => o.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

function uniqueOptions(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function buildClassGroupOptions(classes: string[], sectionsByClass: Record<string, string[]>, extras: string[]) {
  const set = new Set<string>();
  for (const cls of classes) {
    const sections = sectionsByClass[cls] || [];
    if (!sections.length) set.add(cls);
    else {
      for (const sec of sections) {
        set.add(`${cls} - ${sec}`);
        set.add(`${cls}-${sec}`);
      }
    }
  }
  for (const extra of extras) if (extra.trim()) set.add(extra.trim());
  return [...set].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
}

function InfoRow({ icon: Icon, label, value }: { icon?: typeof User; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      {Icon && <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 font-medium">{label}</p>
        <p className="text-xs text-slate-800 font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  edit,
  onChange,
  type = 'text',
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  edit: boolean;
  onChange: (value: string) => void;
  type?: string;
  options?: Array<{ value: string; label: string }>;
  icon?: typeof User;
}) {
  if (!edit) return <InfoRow icon={Icon} label={label} value={value} />;
  return (
    <label className="block py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      {options ? (
        <select className={`${am.input} mt-0.5 text-xs py-1.5`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          className={`${am.input} mt-0.5 text-xs py-1.5`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

type EditForm = {
  fullName: string;
  employeeCode: string;
  designation: string;
  department: string;
  classGroup: string;
  email: string;
  mobile: string;
  joinDate: string;
  employmentType: string;
  status: string;
  panNumber: string;
  bankAccount: string;
  bankIfsc: string;
  pfNumber: string;
  esicNumber: string;
  school: string;
  workLocation: string;
  reportingTo: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  aadhaarNumber: string;
  probationEnds: string;
  confirmationDate: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  personalEmail: string;
  emergencyContact: string;
  emergencyMobile: string;
  presentAddress: string;
  permanentAddress: string;
  languagesKnown: string;
  hobbies: string;
  linkedIn: string;
  idCardNumber: string;
  subject: string;
  classTeacher: string;
  employmentStatus: string;
  noticePeriod: string;
  payScale: string;
  bankName: string;
  paymentMode: string;
  professionalTaxNo: string;
  marriageAnniversary: string;
  contractEndDate: string;
};

function detailToForm(d: EmployeeDirectoryDetail): EditForm {
  const p = (d.profile || {}) as Record<string, unknown>;
  return {
    fullName: d.fullName || '',
    employeeCode: d.employeeCode || '',
    designation: d.designation || '',
    department: d.department || '',
    classGroup: d.classGroup || '',
    email: d.email || '',
    mobile: d.mobile || '',
    joinDate: d.joinDate || '',
    employmentType: d.employmentType || 'TEACHING',
    status: d.status || 'ACTIVE',
    panNumber: d.panNumber || '',
    bankAccount: d.bankAccount || '',
    bankIfsc: d.bankIfsc || '',
    pfNumber: d.pfNumber || '',
    esicNumber: d.esicNumber || '',
    school: str(p.school),
    workLocation: str(p.workLocation),
    reportingTo: str(p.reportingTo),
    dateOfBirth: str(p.dateOfBirth),
    gender: str(p.gender),
    maritalStatus: str(p.maritalStatus),
    bloodGroup: str(p.bloodGroup),
    nationality: str(p.nationality),
    aadhaarNumber: str(p.aadhaarNumber),
    probationEnds: str(p.probationEnds),
    confirmationDate: str(p.confirmationDate),
    fatherName: str(p.fatherName),
    motherName: str(p.motherName),
    spouseName: str(p.spouseName),
    personalEmail: str(p.personalEmail),
    emergencyContact: str(p.emergencyContact),
    emergencyMobile: str(p.emergencyMobile),
    presentAddress: str(p.presentAddress),
    permanentAddress: str(p.permanentAddress),
    languagesKnown: str(p.languagesKnown),
    hobbies: str(p.hobbies),
    linkedIn: str(p.linkedIn),
    idCardNumber: str(p.idCardNumber),
    subject: str(p.subject),
    classTeacher: str(p.classTeacher) || d.classGroup || '',
    employmentStatus: str(p.employmentStatus) || (d.status === 'ACTIVE' ? 'Active' : d.status),
    noticePeriod: str(p.noticePeriod),
    payScale: str(p.payScale),
    bankName: str(p.bankName),
    paymentMode: str(p.paymentMode),
    professionalTaxNo: str(p.professionalTaxNo),
    marriageAnniversary: str(p.marriageAnniversary),
    contractEndDate: str(p.contractEndDate),
  };
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
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [classGroupFilter, setClassGroupFilter] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('Personal Information');
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [addForm, setAddForm] = useState({
    fullName: '',
    designation: '',
    department: '',
    classGroup: '',
    mobile: '',
    email: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<HrDepartmentSummary[]>([]);
  const [classGroupOptions, setClassGroupOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);

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
        department: departmentFilter || undefined,
        classGroup: classGroupFilter || undefined,
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
  }, [search, statusFilter, departmentFilter, classGroupFilter]);

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
    setEditMode(false);
    setEditForm(null);
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [deptRes, meta, staff] = await Promise.all([
          listHrDepartments({ seed: true }),
          fetchAcademicMeta(),
          fetchDepartmentEmployeeOptions(),
        ]);
        if (cancelled) return;
        setDepartments(deptRes.records || []);
        setClassGroupOptions(buildClassGroupOptions(meta.classes || [], meta.sectionsByClass || {}, []));
        setEmployeeOptions(staff.records || []);
      } catch {
        /* mapping dropdowns stay empty; free-text still works via withCurrent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = useMemo(() => (detail?.profile || {}) as Record<string, string | string[] | unknown[]>, [detail]);

  const departmentOptions = useMemo(() => {
    const names = [
      ...departments.map((d) => d.name),
      ...rows.map((r) => r.department),
      detail?.department || '',
    ];
    return uniqueOptions(names);
  }, [departments, rows, detail]);

  const mappedClassGroupOptions = useMemo(
    () =>
      buildClassGroupOptions(
        [],
        {},
        [
          ...classGroupOptions.map((o) => o.value),
          ...rows.map((r) => r.classGroup),
          detail?.classGroup || '',
        ],
      ),
    [classGroupOptions, rows, detail],
  );

  const reportingOptions = useMemo(
    () => employeeOptions.map((e) => ({ value: e.fullName, label: e.label || `${e.fullName} (${e.employeeCode})` })),
    [employeeOptions],
  );

  const form = editForm ?? (detail ? detailToForm(detail) : null);

  const setField = (key: keyof EditForm) => (value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const startEdit = () => {
    if (!detail) return;
    setEditForm(detailToForm(detail));
    setEditMode(true);
    setMessage('');
    setError('');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedId || !editForm) return;
    setSaving(true);
    setError('');
    try {
      const { record } = await updateEmployeeDirectory(selectedId, {
        fullName: editForm.fullName,
        employeeCode: editForm.employeeCode,
        designation: editForm.designation,
        department: editForm.department,
        classGroup: editForm.classGroup,
        email: editForm.email,
        mobile: editForm.mobile,
        joinDate: editForm.joinDate || null,
        employmentType: editForm.employmentType || undefined,
        status: editForm.status || undefined,
        panNumber: editForm.panNumber,
        bankAccount: editForm.bankAccount,
        bankIfsc: editForm.bankIfsc,
        pfNumber: editForm.pfNumber,
        esicNumber: editForm.esicNumber,
        profile: {
          school: editForm.school,
          workLocation: editForm.workLocation,
          reportingTo: editForm.reportingTo,
          dateOfBirth: editForm.dateOfBirth,
          gender: editForm.gender,
          maritalStatus: editForm.maritalStatus,
          bloodGroup: editForm.bloodGroup,
          nationality: editForm.nationality,
          aadhaarNumber: editForm.aadhaarNumber,
          probationEnds: editForm.probationEnds,
          confirmationDate: editForm.confirmationDate,
          fatherName: editForm.fatherName,
          motherName: editForm.motherName,
          spouseName: editForm.spouseName,
          personalEmail: editForm.personalEmail,
          emergencyContact: editForm.emergencyContact,
          emergencyMobile: editForm.emergencyMobile,
          presentAddress: editForm.presentAddress,
          permanentAddress: editForm.permanentAddress,
          languagesKnown: editForm.languagesKnown,
          hobbies: editForm.hobbies,
          linkedIn: editForm.linkedIn,
          idCardNumber: editForm.idCardNumber,
          subject: editForm.subject,
          classTeacher: editForm.classTeacher || editForm.classGroup,
          employmentStatus: editForm.employmentStatus,
          noticePeriod: editForm.noticePeriod,
          payScale: editForm.payScale,
          bankName: editForm.bankName,
          paymentMode: editForm.paymentMode,
          professionalTaxNo: editForm.professionalTaxNo,
          marriageAnniversary: editForm.marriageAnniversary,
          contractEndDate: editForm.contractEndDate,
        },
      });
      setDetail(record);
      setEditMode(false);
      setEditForm(null);
      setMessage(`Employee ${record.recordId} updated`);
      void loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

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

  const handleBulkUpload = async (file: File) => {
    setBulkBusy(true);
    setError('');
    setMessage('');
    try {
      const rows = await parseEmployeeDirectoryUploadFile(file);
      const result = await bulkUploadEmployeeDirectory(rows as unknown as Record<string, unknown>[]);
      setMessage(result.message);
      if (result.errors.length) {
        setError(result.errors.slice(0, 8).join(' · ') + (result.errors.length > 8 ? ` …(+${result.errors.length - 8} more)` : ''));
      }
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk upload failed');
    } finally {
      setBulkBusy(false);
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
        subtitle="Search, view and manage employee profiles — bulk upload staff with salary structure via Excel"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadEmployeeDirectoryTemplate()}
              className={am.btnSecondary}
              title="Download Excel template with salary structure columns"
            >
              <Download size={14} /> Excel Template
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkFileRef.current?.click()}
              className={am.btnSecondary}
              title="Bulk upload existing employees / staff with salary"
            >
              {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Bulk Upload
            </button>
            <input
              ref={bulkFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleBulkUpload(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className={am.btnPrimary}
            >
              <Plus size={14} /> Add New Employee
            </button>
          </div>
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
            <>
              <select className={am.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <select className={am.select} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departmentOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select className={am.select} value={classGroupFilter} onChange={(e) => setClassGroupFilter(e.target.value)}>
                <option value="">All Classes / Groups</option>
                {mappedClassGroupOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </>
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
                  <th className={am.th}>Department</th>
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
                    <td className={am.td}>{row.department || '—'}</td>
                    <td className={am.td}>{row.classGroup || '—'}</td>
                    <td className={`${am.td} text-xs text-slate-600`}>{row.details}</td>
                    <td className={`${am.td} text-xs`}>{row.updated}</td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      <button
                        type="button"
                        onClick={() => {
                          if (editMode && !window.confirm('Discard unsaved employee changes?')) return;
                          setSelectedId(row.id);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className={`${am.td} text-center text-slate-500 py-8`}>
                      No employees match the current search or mapping filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedId && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (editMode && !window.confirm('Discard unsaved employee changes?')) return;
                  setSelectedId(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={14} /> Back to Directory
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {editMode ? (
                  <>
                    <button type="button" disabled={saving} onClick={() => void handleSaveEdit()} className={am.btnPrimary}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Changes
                    </button>
                    <button type="button" disabled={saving} onClick={cancelEdit} className={am.btnSecondary}>
                      <X size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className={`${am.btnSecondary} bg-blue-50 text-blue-700 border-blue-200`}
                  >
                    <Pencil size={14} /> Edit Employee
                  </button>
                )}
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
                        {editMode && form ? (
                          <input
                            className={`${am.input} max-w-sm text-lg font-bold py-1.5`}
                            value={form.fullName}
                            onChange={(e) => setField('fullName')(e.target.value)}
                          />
                        ) : (
                          <h3 className="text-lg font-bold text-slate-900">{detail.fullName}</h3>
                        )}
                        {editMode && form ? (
                          <select
                            className={`${am.select} w-auto text-xs`}
                            value={form.status}
                            onChange={(e) => setField('status')(e.target.value)}
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={detail.status} />
                        )}
                      </div>
                      {form && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                        <EditableField label="Employee ID" value={form.employeeCode} edit={editMode} onChange={setField('employeeCode')} />
                        <EditableField label="Designation" value={form.designation} edit={editMode} onChange={setField('designation')} />
                        <EditableField
                          label="Department"
                          value={form.department}
                          edit={editMode}
                          onChange={setField('department')}
                          options={withCurrent(departmentOptions, form.department)}
                        />
                        <EditableField
                          label="Class / Group"
                          value={form.classGroup}
                          edit={editMode}
                          onChange={setField('classGroup')}
                          options={withCurrent(mappedClassGroupOptions, form.classGroup)}
                        />
                        <EditableField label="School" value={form.school} edit={editMode} onChange={setField('school')} />
                        <EditableField icon={Mail} label="Email" value={form.email} edit={editMode} onChange={setField('email')} type="email" />
                        <EditableField icon={Phone} label="Mobile" value={form.mobile} edit={editMode} onChange={setField('mobile')} />
                        <EditableField icon={Calendar} label="Date of Joining" value={editMode ? form.joinDate : (detail.joinDateDisplay || form.joinDate)} edit={editMode} onChange={setField('joinDate')} type="date" />
                        <EditableField
                          label="Employee Type"
                          value={editMode ? form.employmentType : (detail.employmentTypeLabel || form.employmentType)}
                          edit={editMode}
                          onChange={setField('employmentType')}
                          options={EMPLOYMENT_TYPES}
                        />
                        <EditableField
                          label="Reporting To"
                          value={form.reportingTo}
                          edit={editMode}
                          onChange={setField('reportingTo')}
                          options={withCurrent(reportingOptions, form.reportingTo)}
                        />
                        <EditableField icon={MapPin} label="Work Location" value={form.workLocation} edit={editMode} onChange={setField('workLocation')} />
                        <EditableField label="Probation Ends" value={form.probationEnds} edit={editMode} onChange={setField('probationEnds')} type="date" />
                        <EditableField label="Confirmation Date" value={form.confirmationDate} edit={editMode} onChange={setField('confirmationDate')} type="date" />
                        <EditableField label="Date of Birth" value={form.dateOfBirth} edit={editMode} onChange={setField('dateOfBirth')} type="date" />
                        <EditableField
                          label="Gender"
                          value={form.gender}
                          edit={editMode}
                          onChange={setField('gender')}
                          options={GENDERS.map((g) => ({ value: g, label: g }))}
                        />
                        <EditableField
                          label="Marital Status"
                          value={form.maritalStatus}
                          edit={editMode}
                          onChange={setField('maritalStatus')}
                          options={MARITAL.map((g) => ({ value: g, label: g }))}
                        />
                        <EditableField
                          label="Blood Group"
                          value={form.bloodGroup}
                          edit={editMode}
                          onChange={setField('bloodGroup')}
                          options={BLOOD.map((g) => ({ value: g, label: g }))}
                        />
                        <EditableField label="Nationality" value={form.nationality} edit={editMode} onChange={setField('nationality')} />
                        <EditableField label="PAN Number" value={form.panNumber} edit={editMode} onChange={setField('panNumber')} />
                        <EditableField label="Aadhaar Number" value={form.aadhaarNumber} edit={editMode} onChange={setField('aadhaarNumber')} />
                      </div>
                      )}
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
                    {showPersonal && form && (
                      <SectionCard title="Personal Information">
                        <EditableField icon={Users} label="Father's Name" value={form.fatherName} edit={editMode} onChange={setField('fatherName')} />
                        <EditableField icon={Users} label="Mother's Name" value={form.motherName} edit={editMode} onChange={setField('motherName')} />
                        <EditableField icon={Users} label="Spouse Name" value={form.spouseName} edit={editMode} onChange={setField('spouseName')} />
                        <EditableField icon={Mail} label="Personal Email" value={form.personalEmail} edit={editMode} onChange={setField('personalEmail')} type="email" />
                        <EditableField icon={Phone} label="Mobile Number" value={form.mobile} edit={editMode} onChange={setField('mobile')} />
                        <EditableField label="Emergency Contact" value={form.emergencyContact} edit={editMode} onChange={setField('emergencyContact')} />
                        <EditableField icon={Phone} label="Emergency Mobile" value={form.emergencyMobile} edit={editMode} onChange={setField('emergencyMobile')} />
                        <EditableField icon={MapPin} label="Present Address" value={form.presentAddress} edit={editMode} onChange={setField('presentAddress')} />
                        <EditableField icon={MapPin} label="Permanent Address" value={form.permanentAddress} edit={editMode} onChange={setField('permanentAddress')} />
                        <EditableField label="Languages Known" value={form.languagesKnown} edit={editMode} onChange={setField('languagesKnown')} />
                        <EditableField label="Hobbies" value={form.hobbies} edit={editMode} onChange={setField('hobbies')} />
                        <EditableField label="LinkedIn Profile" value={form.linkedIn} edit={editMode} onChange={setField('linkedIn')} />
                        <EditableField label="ID Card Number" value={form.idCardNumber} edit={editMode} onChange={setField('idCardNumber')} />
                      </SectionCard>
                    )}

                    {showJob && form && (
                      <SectionCard title="Job Information">
                        <EditableField icon={Calendar} label="Joining Date" value={editMode ? form.joinDate : (detail.joinDateDisplay || form.joinDate)} edit={editMode} onChange={setField('joinDate')} type="date" />
                        <EditableField
                          label="Employee Type"
                          value={editMode ? form.employmentType : (detail.employmentTypeLabel || form.employmentType)}
                          edit={editMode}
                          onChange={setField('employmentType')}
                          options={EMPLOYMENT_TYPES}
                        />
                        <EditableField icon={Briefcase} label="Designation" value={form.designation} edit={editMode} onChange={setField('designation')} />
                        <EditableField
                          label="Department"
                          value={form.department}
                          edit={editMode}
                          onChange={setField('department')}
                          options={withCurrent(departmentOptions, form.department)}
                        />
                        <EditableField
                          label="Class / Group"
                          value={form.classGroup}
                          edit={editMode}
                          onChange={setField('classGroup')}
                          options={withCurrent(mappedClassGroupOptions, form.classGroup)}
                        />
                        <EditableField label="Subject" value={form.subject} edit={editMode} onChange={setField('subject')} />
                        <EditableField
                          label="Class Teacher"
                          value={form.classTeacher}
                          edit={editMode}
                          onChange={setField('classTeacher')}
                          options={withCurrent(mappedClassGroupOptions, form.classTeacher)}
                        />
                        <EditableField
                          label="Reporting To"
                          value={form.reportingTo}
                          edit={editMode}
                          onChange={setField('reportingTo')}
                          options={withCurrent(reportingOptions, form.reportingTo)}
                        />
                        <EditableField icon={MapPin} label="Work Location" value={form.workLocation} edit={editMode} onChange={setField('workLocation')} />
                        <EditableField label="Employment Status" value={form.employmentStatus} edit={editMode} onChange={setField('employmentStatus')} />
                        <EditableField label="Probation Ends" value={form.probationEnds} edit={editMode} onChange={setField('probationEnds')} type="date" />
                        <EditableField label="Confirmation Date" value={form.confirmationDate} edit={editMode} onChange={setField('confirmationDate')} type="date" />
                        <EditableField label="Notice Period" value={form.noticePeriod} edit={editMode} onChange={setField('noticePeriod')} />
                      </SectionCard>
                    )}

                    {showSalary && form && (
                      <SectionCard title="Salary & Payment Information">
                        <EditableField label="Pay Scale" value={form.payScale} edit={editMode} onChange={setField('payScale')} />
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
                        <EditableField label="Bank Name" value={form.bankName} edit={editMode} onChange={setField('bankName')} />
                        <EditableField label="Account Number" value={form.bankAccount} edit={editMode} onChange={setField('bankAccount')} />
                        <EditableField label="IFSC Code" value={form.bankIfsc} edit={editMode} onChange={setField('bankIfsc')} />
                        <EditableField label="Payment Mode" value={form.paymentMode} edit={editMode} onChange={setField('paymentMode')} />
                        <EditableField label="PF Number" value={form.pfNumber} edit={editMode} onChange={setField('pfNumber')} />
                        <EditableField label="ESI Number" value={form.esicNumber} edit={editMode} onChange={setField('esicNumber')} />
                        <EditableField label="Professional Tax No." value={form.professionalTaxNo} edit={editMode} onChange={setField('professionalTaxNo')} />
                      </SectionCard>
                    )}

                    {showDates && form && (
                      <SectionCard title="Important Dates">
                        <EditableField icon={Calendar} label="Date of Joining" value={editMode ? form.joinDate : (detail.joinDateDisplay || form.joinDate)} edit={editMode} onChange={setField('joinDate')} type="date" />
                        <EditableField icon={Calendar} label="Probation Ends" value={form.probationEnds} edit={editMode} onChange={setField('probationEnds')} type="date" />
                        <EditableField icon={Calendar} label="Confirmation Date" value={form.confirmationDate} edit={editMode} onChange={setField('confirmationDate')} type="date" />
                        <EditableField icon={Calendar} label="Date of Birth" value={form.dateOfBirth} edit={editMode} onChange={setField('dateOfBirth')} type="date" />
                        <EditableField icon={Calendar} label="Marriage Anniversary" value={form.marriageAnniversary} edit={editMode} onChange={setField('marriageAnniversary')} type="date" />
                        <EditableField icon={Calendar} label="Contract End Date" value={form.contractEndDate} edit={editMode} onChange={setField('contractEndDate')} type="date" />
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
              <select className={am.select} value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}>
                <option value="">Select department…</option>
                {departmentOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Class / Group</label>
            <select className={am.select} value={addForm.classGroup} onChange={(e) => setAddForm((f) => ({ ...f, classGroup: e.target.value }))}>
              <option value="">Select class / group…</option>
              {mappedClassGroupOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
