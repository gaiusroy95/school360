import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  User, Users, BookOpen, HeartPulse, Bus, Home, FileText, IndianRupee, UserPlus,
  CheckCircle, Loader2, Download, ChevronLeft,
} from 'lucide-react';
import { createStudent, fetchStudentsMeta } from '../../../lib/studentServices';
import { fetchInstitutionSetup } from '../../../lib/institutionApi';
import { toViewKey } from '../../../lib/navigation';
import {
  ADMISSION_DOCUMENT_FIELDS,
  DRAFT_STORAGE_KEY,
  emptyAdmissionForm,
  schoolFromInstitutionSetup,
  type SchoolBranding,
  type StudentAdmissionFormData,
} from './studentAdmissionFormTypes';
import { AdmissionFormPage1, AdmissionFormPage2 } from './StudentAdmissionFormPreview';
import { downloadAdmissionFormPdf } from './studentAdmissionPdf';
import { isIndiaMobileEmpty, isValidIndiaMobile, normalizeIndiaMobile } from '../../../lib/enquiryFormUtils';

type Props = {
  onNavigate?: (view: string) => void;
  onCreated?: () => void;
};

export function AddNewStudentView({ onNavigate, onCreated }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<StudentAdmissionFormData>(emptyAdmissionForm);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [school, setSchool] = useState<SchoolBranding>(schoolFromInstitutionSetup(null));
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const pdfPage1Ref = useRef<HTMLDivElement>(null);
  const pdfPage2Ref = useRef<HTMLDivElement>(null);

  const steps = [
    { id: 1, name: 'Basic Info', icon: <User size={14} /> },
    { id: 2, name: 'Parents', icon: <Users size={14} /> },
    { id: 3, name: 'Academic', icon: <BookOpen size={14} /> },
    { id: 4, name: 'Medical', icon: <HeartPulse size={14} /> },
    { id: 5, name: 'Transport', icon: <Bus size={14} /> },
    { id: 6, name: 'Hostel', icon: <Home size={14} /> },
    { id: 7, name: 'Documents', icon: <FileText size={14} /> },
    { id: 8, name: 'Fee Setup', icon: <IndianRupee size={14} /> },
    { id: 9, name: 'Generate', icon: <UserPlus size={14} /> },
  ];

  const set = useCallback(<K extends keyof StudentAdmissionFormData>(key: K, value: StudentAdmissionFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDraftSaved(false);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { form?: StudentAdmissionFormData; step?: number };
        if (parsed.form) {
          const restored = { ...emptyAdmissionForm(), ...parsed.form };
          restored.mobile = normalizeIndiaMobile(restored.mobile);
          restored.fatherMobile = normalizeIndiaMobile(restored.fatherMobile);
          restored.motherMobile = normalizeIndiaMobile(restored.motherMobile);
          restored.guardianMobile = normalizeIndiaMobile(restored.guardianMobile);
          restored.doctorPhone = normalizeIndiaMobile(restored.doctorPhone);
          setForm(restored);
        }
        if (parsed.step) setCurrentStep(parsed.step);
      } catch { /* ignore */ }
    }
    void fetchStudentsMeta().then((m) => {
      setForm((f) => ({ ...f, academicYear: f.academicYear || m.filters.defaultAcademicYear }));
      setClasses(m.filters.classes);
    });
    void fetchInstitutionSetup().then(({ setup }) => {
      setSchool(schoolFromInstitutionSetup(setup as Record<string, unknown>));
    });
  }, []);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSections(form.className ? m.filters.sectionsByClass[form.className] || [] : []);
    });
  }, [form.className]);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, step: currentStep, savedAt: new Date().toISOString() }));
    setDraftSaved(true);
    setSuccess('Draft saved locally. You can continue later.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const validateMobile = (value: string, label: string, required = false): boolean => {
    if (required && isIndiaMobileEmpty(value)) {
      setError(`${label} is required (+91 followed by 10 digits)`);
      return false;
    }
    if (!isIndiaMobileEmpty(value) && !isValidIndiaMobile(value)) {
      setError(`${label} must be +91 followed by 10 digits`);
      return false;
    }
    return true;
  };

  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 1) {
      if (!form.firstName.trim()) { setError('First name is required'); return false; }
      if (!validateMobile(form.mobile, 'Mobile', true)) return false;
    }
    if (step === 2) {
      if (!validateMobile(form.fatherMobile, "Father's mobile")) return false;
      if (!validateMobile(form.motherMobile, "Mother's mobile")) return false;
      if (!validateMobile(form.guardianMobile, "Guardian's mobile")) return false;
    }
    if (step === 3 && !form.className.trim()) { setError('Class is required'); return false; }
    if (step === 4 && !validateMobile(form.doctorPhone, "Doctor's phone")) return false;
    if (step === 9 && !form.declarationAccepted) { setError('Please accept the declaration'); return false; }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(9, s + 1));
  };

  const readPhoto = (file: File, key: 'studentPhoto' | 'fatherPhoto' | 'motherPhoto') => {
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleDownloadPdf = async () => {
    if (!pdfPage1Ref.current || !pdfPage2Ref.current) return;
    setGeneratingPdf(true);
    setError('');
    try {
      await downloadAdmissionFormPdf(pdfPage1Ref.current, pdfPage2Ref.current, form);
      setSuccess('Admission application PDF downloaded.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4) || !validateStep(9)) return;
    setSaving(true);
    setError('');
    try {
      await createStudent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        aadhaarNumber: form.aadhaarNumber || undefined,
        religion: form.religion || undefined,
        nationality: form.nationality,
        category: form.category,
        placeOfBirth: form.placeOfBirth || undefined,
        address: [form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ') || undefined,
        mobile: isIndiaMobileEmpty(form.mobile) ? undefined : normalizeIndiaMobile(form.mobile),
        email: form.email || undefined,
        className: form.className.trim(),
        sectionName: form.sectionName || undefined,
        academicYear: form.academicYear,
        house: form.house || undefined,
        rollNumber: form.rollNumber || undefined,
        fatherName: form.fatherName || undefined,
        fatherMobile: isIndiaMobileEmpty(form.fatherMobile) ? undefined : normalizeIndiaMobile(form.fatherMobile),
        motherName: form.motherName || undefined,
        motherMobile: isIndiaMobileEmpty(form.motherMobile) ? undefined : normalizeIndiaMobile(form.motherMobile),
        customFields: {
          admissionForm: {
            ...form,
            studentPhoto: form.studentPhoto ? '[attached]' : '',
            fatherPhoto: form.fatherPhoto ? '[attached]' : '',
            motherPhoto: form.motherPhoto ? '[attached]' : '',
          },
        },
        documents: {
          birth_certificate: form.docBirthCertificate,
          aadhaar_card: form.docAadhaar,
          transfer_certificate: form.docTransferCertificate,
          previous_marksheet: form.docMarksheet,
          passport_photo: form.docPhoto,
        },
      });
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSuccess('Student created and enrolled successfully!');
      onCreated?.();
      setTimeout(() => onNavigate?.(toViewKey('Student Management', 'Students List')), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const stepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm title="Basic Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First Name *" value={form.firstName} onChange={(v) => set('firstName', v)} />
              <Field label="Last Name" value={form.lastName} onChange={(v) => set('lastName', v)} />
              <Field label="Date of Birth *" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
              <Select label="Gender *" value={form.gender} onChange={(v) => set('gender', v)} options={['', 'Male', 'Female', 'Other']} />
              <Select label="Blood Group" value={form.bloodGroup} onChange={(v) => set('bloodGroup', v)} options={['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
              <Field label="Aadhaar Number" value={form.aadhaarNumber} onChange={(v) => set('aadhaarNumber', v)} />
              <Field label="Religion" value={form.religion} onChange={(v) => set('religion', v)} />
              <Field label="Nationality" value={form.nationality} onChange={(v) => set('nationality', v)} />
              <Select label="Category" value={form.category} onChange={(v) => set('category', v)} options={['General', 'OBC', 'SC/ST', 'Other']} />
              <Field label="Place of Birth" value={form.placeOfBirth} onChange={(v) => set('placeOfBirth', v)} />
              <MobileField label="Mobile *" value={form.mobile} onChange={(v) => set('mobile', v)} required />
              <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Photo (for PDF)</label>
              <input type="file" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) readPhoto(f, 'studentPhoto'); }} />
            </div>
          </StepForm>
        );
      case 2:
        return (
          <StepForm title="Parent / Guardian Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Father's Name *" value={form.fatherName} onChange={(v) => set('fatherName', v)} />
              <MobileField label="Father Mobile" value={form.fatherMobile} onChange={(v) => set('fatherMobile', v)} />
              <Field label="Father Email" value={form.fatherEmail} onChange={(v) => set('fatherEmail', v)} />
              <Field label="Father Occupation" value={form.fatherOccupation} onChange={(v) => set('fatherOccupation', v)} />
              <Field label="Mother's Name *" value={form.motherName} onChange={(v) => set('motherName', v)} />
              <MobileField label="Mother Mobile" value={form.motherMobile} onChange={(v) => set('motherMobile', v)} />
              <Field label="Mother Email" value={form.motherEmail} onChange={(v) => set('motherEmail', v)} />
              <Field label="Mother Occupation" value={form.motherOccupation} onChange={(v) => set('motherOccupation', v)} />
              <Field label="Guardian Name" value={form.guardianName} onChange={(v) => set('guardianName', v)} />
              <MobileField label="Guardian Mobile" value={form.guardianMobile} onChange={(v) => set('guardianMobile', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Father Photo</label>
                <input type="file" accept="image/*" className="text-xs w-full" onChange={(e) => { const f = e.target.files?.[0]; if (f) readPhoto(f, 'fatherPhoto'); }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mother Photo</label>
                <input type="file" accept="image/*" className="text-xs w-full" onChange={(e) => { const f = e.target.files?.[0]; if (f) readPhoto(f, 'motherPhoto'); }} />
              </div>
            </div>
          </StepForm>
        );
      case 3:
        return (
          <StepForm title="Academic Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Class / Grade *" value={form.className} onChange={(v) => set('className', v)} options={['', ...classes]} />
              <Select label="Section" value={form.sectionName} onChange={(v) => set('sectionName', v)} options={['', ...sections]} />
              <Field label="Academic Year" value={form.academicYear} onChange={(v) => set('academicYear', v)} />
              <Field label="Roll Number" value={form.rollNumber} onChange={(v) => set('rollNumber', v)} />
              <Field label="House" value={form.house} onChange={(v) => set('house', v)} />
              <Field label="Admission Date" type="date" value={form.admissionDate} onChange={(v) => set('admissionDate', v)} />
              <Select label="Admission Type" value={form.admissionType} onChange={(v) => set('admissionType', v)} options={['New Admission', 'Transfer', 'Re-admission']} />
              <Field label="Previous School" value={form.previousSchool} onChange={(v) => set('previousSchool', v)} />
            </div>
          </StepForm>
        );
      case 4:
        return (
          <StepForm title="Medical Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Known Allergies" value={form.allergies} onChange={(v) => set('allergies', v)} />
              <Field label="Medical Conditions" value={form.medicalConditions} onChange={(v) => set('medicalConditions', v)} />
              <Field label="Family Doctor" value={form.doctorName} onChange={(v) => set('doctorName', v)} />
              <MobileField label="Doctor Phone" value={form.doctorPhone} onChange={(v) => set('doctorPhone', v)} />
              <Field label="Emergency Contact" value={form.emergencyContact} onChange={(v) => set('emergencyContact', v)} />
              <Select label="Vaccination Status" value={form.vaccinationStatus} onChange={(v) => set('vaccinationStatus', v)} options={['Complete', 'Partial', 'Not Available']} />
            </div>
          </StepForm>
        );
      case 5:
        return (
          <StepForm title="Transport">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Transport Required?" value={form.transportRequired} onChange={(v) => set('transportRequired', v)} options={['No', 'Yes']} />
              <Field label="Preferred Route" value={form.transportRoute} onChange={(v) => set('transportRoute', v)} />
              <Field label="Pickup / Drop Stop" value={form.transportStop} onChange={(v) => set('transportStop', v)} />
              <Field label="Vehicle Preference" value={form.vehiclePreference} onChange={(v) => set('vehiclePreference', v)} />
            </div>
          </StepForm>
        );
      case 6:
        return (
          <StepForm title="Hostel">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Hostel Required?" value={form.hostelRequired} onChange={(v) => set('hostelRequired', v)} options={['No', 'Yes']} />
              <Field label="Room Type Preference" value={form.hostelRoomType} onChange={(v) => set('hostelRoomType', v)} />
              <Field label="Mess Preference" value={form.messPreference} onChange={(v) => set('messPreference', v)} />
            </div>
          </StepForm>
        );
      case 7:
        return (
          <StepForm title="Address & Documents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Field label="Permanent Address" value={form.address} onChange={(v) => set('address', v)} />
              <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
              <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
              <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v)} />
            </div>
            <p className="text-xs font-bold text-slate-700 mb-2">Documents submitted (check when available)</p>
            <div className="space-y-2">
              {ADMISSION_DOCUMENT_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </StepForm>
        );
      case 8:
        return (
          <StepForm title="Fee Setup">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Fee Group" value={form.feeGroup} onChange={(v) => set('feeGroup', v)} options={['Standard', 'Transport', 'Hostel', 'Custom']} />
              <Select label="Payment Mode" value={form.paymentMode} onChange={(v) => set('paymentMode', v)} options={['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer']} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Remarks</label>
                <textarea value={form.feeRemarks} onChange={(e) => set('feeRemarks', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm min-h-[80px]" />
              </div>
            </div>
          </StepForm>
        );
      case 9:
        return (
          <StepForm title="Generate Application">
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <p className="text-sm text-slate-600">
                Review the PDF previews on both sides. Download the admission form, then enroll the student in the roster.
              </p>
              <label className="flex items-center justify-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.declarationAccepted} onChange={(e) => set('declarationAccepted', e.target.checked)} />
                I confirm all details are correct and accept the declaration
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" disabled={generatingPdf} onClick={() => void handleDownloadPdf()} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
                  {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download PDF
                </button>
                <button type="button" disabled={saving} onClick={() => void handleSubmit()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Create Student & Enroll
                </button>
              </div>
            </div>
          </StepForm>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="p-4 md:p-6 pb-2 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Add New Student</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">Digital onboarding with automated ERP setup</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} className="px-3 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-xs md:text-sm font-medium hover:bg-slate-50">
              Save Draft{draftSaved ? ' ✓' : ''}
            </button>
            {currentStep > 1 && (
              <button type="button" onClick={() => setCurrentStep((s) => s - 1)} className="px-3 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-xs md:text-sm flex items-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {currentStep < 9 ? (
              <button type="button" onClick={nextStep} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700">
                Next Step
              </button>
            ) : null}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {success && <p className="text-sm text-green-600 mb-2">{success}</p>}
        <div className="flex items-center justify-between pb-3 overflow-x-auto custom-scrollbar">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center flex-shrink-0 mx-1.5 relative min-w-[64px]">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 ${currentStep === step.id ? 'bg-indigo-600 border-indigo-600 text-white' : currentStep > step.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {currentStep > step.id ? <CheckCircle size={14} /> : step.icon}
              </button>
              <span className={`text-[9px] font-bold mt-1.5 text-center ${currentStep === step.id ? 'text-indigo-600' : currentStep > step.id ? 'text-emerald-600' : 'text-slate-400'}`}>{step.name}</span>
              {idx < steps.length - 1 && (
                <div className={`absolute top-[18px] left-1/2 h-[2px] -z-0 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ width: 'calc(100% + 0.75rem)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 md:gap-4 max-w-[1600px] mx-auto items-start">
          <div className="xl:col-span-3 order-2 xl:order-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">PDF Page 1 — Live Preview</p>
            <div className="sticky top-2 scale-[0.95] xl:scale-100 origin-top">
              <AdmissionFormPage1 form={form} school={school} />
            </div>
          </div>

          <div className="xl:col-span-6 order-1 xl:order-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 min-h-[420px]">
              {stepContent()}
            </div>
          </div>

          <div className="xl:col-span-3 order-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">PDF Page 2 — Live Preview</p>
            <div className="sticky top-2 scale-[0.95] xl:scale-100 origin-top">
              <AdmissionFormPage2 form={form} school={school} />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden full-size A4 pages for PDF export */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
        <AdmissionFormPage1 form={form} school={school} exportMode innerRef={pdfPage1Ref} />
        <AdmissionFormPage2 form={form} school={school} exportMode innerRef={pdfPage2Ref} />
      </div>
    </div>
  );
}

function StepForm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
  );
}

function MobileField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const normalized = normalizeIndiaMobile(value);
  const digits = normalized.startsWith('+91') ? normalized.slice(3) : normalized.replace(/^\+?91/, '');

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <span className="px-3 py-2 bg-slate-50 text-sm font-semibold text-slate-600 border-r border-slate-300 select-none">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          required={required}
          placeholder="9876543210"
          value={digits}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '').slice(0, 10);
            onChange(`+91${next}`);
          }}
          className="flex-1 p-2 text-sm focus:outline-none"
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">+91 format only. Enter 10-digit mobile number.</p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500">
        {options.map((o) => <option key={o || 'blank'} value={o}>{o || 'Select...'}</option>)}
      </select>
    </div>
  );
}
