import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Student, StudentInput } from '../../../lib/studentServices';
import { updateStudent } from '../../../lib/studentServices';
import { getAdmissionForm } from '../../../lib/idCardUtils';
import { ID_CARD_TEMPLATES } from '../InstitutionSetup/idCardTypes';
import { isIndiaMobileEmpty, isValidIndiaMobile, normalizeIndiaMobile } from '../../../lib/enquiryFormUtils';

type Props = {
  student: Student;
  activeTab: string;
  profileMeta: { feeDueAmount: number; attendanceToday: string; idCardTemplate: string };
  onClose: () => void;
  onSaved: (student: Student) => void;
};

type AdmissionPatch = {
  allergies: string;
  medicalConditions: string;
  doctorName: string;
  doctorPhone: string;
  emergencyContact: string;
  vaccinationStatus: string;
  transportRequired: string;
  transportRoute: string;
  transportStop: string;
  vehiclePreference: string;
  hostelRequired: string;
  hostelRoomType: string;
  messPreference: string;
  feeGroup: string;
  paymentMode: string;
  feeRemarks: string;
  admissionType: string;
  previousSchool: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  aadhaarNumber: string;
  religion: string;
  nationality: string;
  category: string;
  placeOfBirth: string;
  address: string;
  mobile: string;
  email: string;
  className: string;
  sectionName: string;
  academicYear: string;
  house: string;
  rollNumber: string;
  rfidTag: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  status: string;
  entranceScore: string;
  feeDueAmount: number;
  attendanceToday: string;
  idCardTemplate: string;
  documents: Record<string, boolean>;
  admissionPatch: AdmissionPatch;
};

export function StudentProfileEditModal({ student, activeTab, profileMeta, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(() => buildFormState(student, profileMeta));

  useEffect(() => {
    setForm(buildFormState(student, profileMeta));
  }, [student, profileMeta]);

  const patchAdmission = (key: keyof AdmissionPatch, value: string) => {
    setForm((f) => ({ ...f, admissionPatch: { ...f.admissionPatch, [key]: value } }));
  };

  const handleSave = async () => {
    setError('');
    if (!isIndiaMobileEmpty(form.mobile) && !isValidIndiaMobile(form.mobile)) {
      setError('Mobile must be +91 followed by 10 digits');
      return;
    }
    setSaving(true);
    try {
      const admissionForm = { ...getAdmissionForm(student), ...form.admissionPatch };
      const profile = {
        feeDueAmount: Number(form.feeDueAmount) || 0,
        attendanceToday: form.attendanceToday,
        idCardTemplate: form.idCardTemplate,
      };

      const payload: Partial<StudentInput> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup,
        aadhaarNumber: form.aadhaarNumber,
        religion: form.religion,
        nationality: form.nationality,
        category: form.category,
        placeOfBirth: form.placeOfBirth,
        address: form.address,
        mobile: isIndiaMobileEmpty(form.mobile) ? '' : normalizeIndiaMobile(form.mobile),
        email: form.email,
        className: form.className,
        sectionName: form.sectionName,
        academicYear: form.academicYear,
        house: form.house,
        rollNumber: form.rollNumber,
        rfidTag: form.rfidTag,
        fatherName: form.fatherName,
        fatherMobile: isIndiaMobileEmpty(form.fatherMobile) ? '' : normalizeIndiaMobile(form.fatherMobile),
        motherName: form.motherName,
        motherMobile: isIndiaMobileEmpty(form.motherMobile) ? '' : normalizeIndiaMobile(form.motherMobile),
        status: form.status,
        entranceScore: form.entranceScore ? Number(form.entranceScore) : undefined,
        documents: form.documents,
        customFields: {
          ...student.customFields,
          admissionForm,
          profile,
          idCardTemplate: form.idCardTemplate,
        },
      };

      const res = await updateStudent(student.id, payload);
      onSaved(res.student);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Edit Profile — {activeTab}</h2>
            <p className="text-xs text-slate-500">Changes apply to {student.fullName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {renderFields(activeTab, form, setForm, patchAdmission)}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function buildFormState(student: Student, profileMeta: { feeDueAmount: number; attendanceToday: string; idCardTemplate: string }): FormState {
  const af = getAdmissionForm(student);
  const docs = (student.documents || {}) as Record<string, boolean>;
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    aadhaarNumber: student.aadhaarNumber,
    religion: student.religion,
    nationality: student.nationality,
    category: student.category,
    placeOfBirth: student.placeOfBirth,
    address: student.address,
    mobile: student.mobile || '+91',
    email: student.email,
    className: student.className,
    sectionName: student.sectionName,
    academicYear: student.academicYear,
    house: student.house,
    rollNumber: student.rollNumber,
    rfidTag: student.rfidTag,
    fatherName: student.fatherName,
    fatherMobile: student.fatherMobile || '+91',
    motherName: student.motherName,
    motherMobile: student.motherMobile || '+91',
    status: student.status,
    entranceScore: student.entranceScore != null ? String(student.entranceScore) : '',
    feeDueAmount: profileMeta.feeDueAmount,
    attendanceToday: profileMeta.attendanceToday,
    idCardTemplate: profileMeta.idCardTemplate,
    documents: { ...docs },
    admissionPatch: {
      allergies: String(af.allergies || ''),
      medicalConditions: String(af.medicalConditions || ''),
      doctorName: String(af.doctorName || ''),
      doctorPhone: String(af.doctorPhone || '+91'),
      emergencyContact: String(af.emergencyContact || ''),
      vaccinationStatus: String(af.vaccinationStatus || 'Complete'),
      transportRequired: String(af.transportRequired || 'No'),
      transportRoute: String(af.transportRoute || ''),
      transportStop: String(af.transportStop || ''),
      vehiclePreference: String(af.vehiclePreference || ''),
      hostelRequired: String(af.hostelRequired || 'No'),
      hostelRoomType: String(af.hostelRoomType || ''),
      messPreference: String(af.messPreference || ''),
      feeGroup: String(af.feeGroup || 'Standard'),
      paymentMode: String(af.paymentMode || 'Cash'),
      feeRemarks: String(af.feeRemarks || ''),
      admissionType: String(af.admissionType || 'New Admission'),
      previousSchool: String(af.previousSchool || ''),
    },
  };
}

function renderFields(
  tab: string,
  form: FormState,
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  patchAdmission: (key: keyof AdmissionPatch, value: string) => void,
) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const fieldsForTab: Record<string, ReactNode> = {
    Overview: (
      <>
        <Row label="First Name" value={form.firstName} onChange={(v) => set('firstName', v)} />
        <Row label="Last Name" value={form.lastName} onChange={(v) => set('lastName', v)} />
        <Row label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
        <Row label="Gender" value={form.gender} onChange={(v) => set('gender', v)} />
        <Row label="Blood Group" value={form.bloodGroup} onChange={(v) => set('bloodGroup', v)} />
        <Row label="Category" value={form.category} onChange={(v) => set('category', v)} />
        <MobileRow label="Mobile" value={form.mobile} onChange={(v) => set('mobile', v)} />
        <Row label="Email" value={form.email} onChange={(v) => set('email', v)} />
        <Row label="Address" value={form.address} onChange={(v) => set('address', v)} className="sm:col-span-2" />
        <Row label="Aadhaar" value={form.aadhaarNumber} onChange={(v) => set('aadhaarNumber', v)} />
        <Row label="RFID Tag" value={form.rfidTag} onChange={(v) => set('rfidTag', v)} />
        <SelectRow label="Status" value={form.status} options={['Active', 'Inactive', 'Passout', 'Transferred']} onChange={(v) => set('status', v)} />
        <SelectRow label="Attendance Today" value={form.attendanceToday} options={['Present', 'Absent', 'On Leave']} onChange={(v) => set('attendanceToday', v)} />
        <SelectRow label="ID Card Template" value={form.idCardTemplate} options={['', ...ID_CARD_TEMPLATES.map((t) => t.name)]} onChange={(v) => set('idCardTemplate', v)} />
        <Row label="Father's Name" value={form.fatherName} onChange={(v) => set('fatherName', v)} />
        <MobileRow label="Father Mobile" value={form.fatherMobile} onChange={(v) => set('fatherMobile', v)} />
        <Row label="Mother's Name" value={form.motherName} onChange={(v) => set('motherName', v)} />
        <MobileRow label="Mother Mobile" value={form.motherMobile} onChange={(v) => set('motherMobile', v)} />
      </>
    ),
    Academics: (
      <>
        <Row label="Class" value={form.className} onChange={(v) => set('className', v)} />
        <Row label="Section" value={form.sectionName} onChange={(v) => set('sectionName', v)} />
        <Row label="Roll Number" value={form.rollNumber} onChange={(v) => set('rollNumber', v)} />
        <Row label="Academic Year" value={form.academicYear} onChange={(v) => set('academicYear', v)} />
        <Row label="House" value={form.house} onChange={(v) => set('house', v)} />
        <Row label="Entrance Score" value={form.entranceScore} onChange={(v) => set('entranceScore', v)} />
        <Row label="Previous School" value={form.admissionPatch.previousSchool} onChange={(v) => patchAdmission('previousSchool', v)} className="sm:col-span-2" />
      </>
    ),
    Parents: (
      <>
        <Row label="Father's Name" value={form.fatherName} onChange={(v) => set('fatherName', v)} />
        <MobileRow label="Father Mobile" value={form.fatherMobile} onChange={(v) => set('fatherMobile', v)} />
        <Row label="Mother's Name" value={form.motherName} onChange={(v) => set('motherName', v)} />
        <MobileRow label="Mother Mobile" value={form.motherMobile} onChange={(v) => set('motherMobile', v)} />
      </>
    ),
    Medical: (
      <>
        <Row label="Allergies" value={form.admissionPatch.allergies} onChange={(v) => patchAdmission('allergies', v)} />
        <Row label="Medical Conditions" value={form.admissionPatch.medicalConditions} onChange={(v) => patchAdmission('medicalConditions', v)} />
        <Row label="Doctor Name" value={form.admissionPatch.doctorName} onChange={(v) => patchAdmission('doctorName', v)} />
        <Row label="Doctor Phone" value={form.admissionPatch.doctorPhone} onChange={(v) => patchAdmission('doctorPhone', v)} />
        <Row label="Emergency Contact" value={form.admissionPatch.emergencyContact} onChange={(v) => patchAdmission('emergencyContact', v)} />
        <SelectRow label="Vaccination" value={form.admissionPatch.vaccinationStatus} options={['Complete', 'Partial', 'Not Available']} onChange={(v) => patchAdmission('vaccinationStatus', v)} />
      </>
    ),
    Transport: (
      <>
        <SelectRow label="Transport Required" value={form.admissionPatch.transportRequired} options={['No', 'Yes']} onChange={(v) => patchAdmission('transportRequired', v)} />
        <Row label="Route" value={form.admissionPatch.transportRoute} onChange={(v) => patchAdmission('transportRoute', v)} />
        <Row label="Stop" value={form.admissionPatch.transportStop} onChange={(v) => patchAdmission('transportStop', v)} />
        <Row label="Vehicle Preference" value={form.admissionPatch.vehiclePreference} onChange={(v) => patchAdmission('vehiclePreference', v)} />
      </>
    ),
    Hostel: (
      <>
        <SelectRow label="Hostel Required" value={form.admissionPatch.hostelRequired} options={['No', 'Yes']} onChange={(v) => patchAdmission('hostelRequired', v)} />
        <Row label="Room Type" value={form.admissionPatch.hostelRoomType} onChange={(v) => patchAdmission('hostelRoomType', v)} />
        <Row label="Mess Preference" value={form.admissionPatch.messPreference} onChange={(v) => patchAdmission('messPreference', v)} />
      </>
    ),
    Fees: (
      <>
        <Row label="Fee Due Amount (₹)" value={String(form.feeDueAmount)} onChange={(v) => set('feeDueAmount', Number(v) || 0)} />
        <SelectRow label="Fee Group" value={form.admissionPatch.feeGroup} options={['Standard', 'Transport', 'Hostel', 'Custom']} onChange={(v) => patchAdmission('feeGroup', v)} />
        <SelectRow label="Payment Mode" value={form.admissionPatch.paymentMode} options={['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer']} onChange={(v) => patchAdmission('paymentMode', v)} />
        <Row label="Fee Remarks" value={form.admissionPatch.feeRemarks} onChange={(v) => patchAdmission('feeRemarks', v)} className="sm:col-span-2" />
      </>
    ),
    Documents: (
      <div className="sm:col-span-2 space-y-2">
        {Object.entries({
          birth_certificate: 'Birth Certificate',
          aadhaar_card: 'Aadhaar Card',
          transfer_certificate: 'Transfer Certificate',
          previous_marksheet: 'Previous Marksheet',
          passport_photo: 'Passport Photo',
        }).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.documents[key]}
              onChange={(e) => set('documents', { ...form.documents, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    ),
    Attendance: (
      <SelectRow label="Attendance Today" value={form.attendanceToday} options={['Present', 'Absent', 'On Leave']} onChange={(v) => set('attendanceToday', v)} />
    ),
  };

  const content = fieldsForTab[tab] || fieldsForTab.Overview;
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{content}</div>;
}

function Row({ label, value, onChange, type = 'text', className = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
    </div>
  );
}

function MobileRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const digits = value.startsWith('+91') ? value.slice(3) : value.replace(/^\+?91/, '');
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <div className="flex rounded-lg border border-slate-300 overflow-hidden">
        <span className="px-2 py-2 bg-slate-50 text-sm font-semibold text-slate-600 border-r">+91</span>
        <input
          type="tel"
          value={digits}
          onChange={(e) => onChange(`+91${e.target.value.replace(/\D/g, '').slice(0, 10)}`)}
          className="flex-1 p-2 text-sm"
        />
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
        {options.map((o) => <option key={o || 'blank'} value={o}>{o || 'Institution default'}</option>)}
      </select>
    </div>
  );
}
